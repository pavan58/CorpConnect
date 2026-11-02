"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/auth/guards";
import { clientIp } from "@/lib/request";
import { sendEmail, otpEmail } from "@/lib/email/resend";
import {
  generateOtp, hashOtp, otpMatches,
  OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS, type OtpPurpose,
} from "@/lib/otp";
import { domainCandidates, emailDomain, isPublicEmailDomain } from "@/lib/email-domain";
import { HUBS, codes } from "@/lib/pune";
import { safeNext } from "@/lib/utils";
import type { ActionState } from "@/lib/action-state";

const RATE_LIMITED = "Too many attempts. Please wait 15 minutes and try again.";

const password = z
  .string()
  .min(10, "Use at least 10 characters")
  .max(72, "Use at most 72 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(80),
  corporateEmail: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  password,
  companyId: z.union([z.literal(""), z.string().uuid()]).optional(),
  companyName: z.string().trim().max(120).optional(),
  designation: z.string().trim().min(2, "Enter your designation").max(80),
  workLocation: z.enum(codes(HUBS), { errorMap: () => ({ message: "Select your Pune work hub" }) }),
  acceptTerms: z.literal("on", { errorMap: () => ({ message: "Please accept the terms" }) }),
}).refine((v) => !!v.companyId || (v.companyName?.length ?? 0) >= 2, {
  path: ["companyId"],
  message: "Search for your company, or add it",
});

type Admin = SupabaseClient;

async function rateLimited(admin: Admin, identifier: string, kind: "send" | "verify") {
  const { data, error } = await admin.rpc("check_otp_rate_limit", {
    p_identifier: identifier,
    p_ip: await clientIp(),
    p_kind: kind,
  });
  if (error) {
    console.error("rate limit check failed", error);
    return true; // fail closed
  }
  return data !== true;
}

/** Creates (or replaces) the user's OTP for `purpose` and emails it via Resend. */
async function issueOtp(admin: Admin, user: { id: string; email: string; name: string }, purpose: OtpPurpose) {
  const { data: existing } = await admin
    .from("email_otps").select("sent_at").eq("user_id", user.id).eq("purpose", purpose).maybeSingle();
  if (existing && Date.now() - new Date(existing.sent_at).getTime() < OTP_RESEND_COOLDOWN_MS) {
    return { ok: false as const, error: "A code was just sent. Wait a minute before requesting another." };
  }

  const { data: suppressed } = await admin.from("email_suppressions").select("reason").eq("email", user.email).maybeSingle();
  if (suppressed) {
    return { ok: false as const, error: "Emails to this address are bouncing. Check the address with your IT team, or contact support." };
  }

  const code = generateOtp();
  const now = Date.now();
  const { error } = await admin.from("email_otps").upsert({
    user_id: user.id,
    purpose,
    code_hash: hashOtp(user.id, purpose, code),
    attempts: 0,
    sent_at: new Date(now).toISOString(),
    expires_at: new Date(now + OTP_TTL_MS).toISOString(),
  });
  if (error) {
    console.error("otp upsert failed", error);
    return { ok: false as const, error: "Could not create a verification code. Try again." };
  }

  const mail = otpEmail({ name: user.name, code, purpose });
  const sent = await sendEmail({ to: user.email, ...mail, idempotencyKey: `${purpose}-${user.id}-${now}` });
  return sent.ok ? { ok: true as const } : { ok: false as const, error: "We couldn't send the email. Try again in a minute." };
}

/** Checks a submitted code. Increments attempts on failure, deletes the row on success. */
async function consumeOtp(admin: Admin, userId: string, purpose: OtpPurpose, code: string) {
  const { data: row } = await admin
    .from("email_otps").select("code_hash, attempts, expires_at")
    .eq("user_id", userId).eq("purpose", purpose).maybeSingle();

  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false as const, error: "This code has expired. Request a new one." };
  }
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false as const, error: "Too many incorrect attempts. Request a new code." };
  }
  if (!otpMatches(row.code_hash, userId, purpose, code)) {
    await admin.from("email_otps").update({ attempts: row.attempts + 1 }).eq("user_id", userId).eq("purpose", purpose);
    const left = OTP_MAX_ATTEMPTS - row.attempts - 1;
    return { ok: false as const, error: left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many incorrect attempts. Request a new code." };
  }
  await admin.from("email_otps").delete().eq("user_id", userId).eq("purpose", purpose);
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------
export async function registerEmployee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const input = parsed.data;

  const domain = emailDomain(input.corporateEmail);
  if (!domain) return { fieldErrors: { corporateEmail: ["Enter a valid email"] } };
  if (isPublicEmailDomain(domain)) {
    return { fieldErrors: { corporateEmail: ["Use your official company email. Personal addresses like Gmail or Outlook can't verify employment."] } };
  }

  const admin = createAdminClient();

  if (await rateLimited(admin, input.corporateEmail, "send")) return { message: RATE_LIMITED };

  // Company is decided by the email domain, not by what the form says.
  const { data: domainRows } = await admin
    .from("company_domains").select("domain, company_id, companies(name, is_active)")
    .in("domain", domainCandidates(domain));
  const match = (domainRows ?? [])
    .filter((r) => (r.companies as unknown as { is_active: boolean } | null)?.is_active)
    .sort((a, b) => b.domain.length - a.domain.length)[0];

  if (!match) {
    // Unknown domain: never auto-approve (anyone can own a domain). Log it with
    // the company the user named so an admin can verify and approve it.
    let hint = input.companyName || null;
    if (!hint && input.companyId) {
      const { data: picked } = await admin.from("companies").select("name").eq("id", input.companyId).maybeSingle();
      hint = picked?.name ?? null;
    }
    await admin.from("company_domain_requests").upsert(
      { domain, requested_email: input.corporateEmail, company_hint: hint },
      { onConflict: "domain,requested_email" },
    );
    return {
      fieldErrors: {
        corporateEmail: [
          `@${domain} isn't verified on CorpConnect Pune yet${hint ? ` for ${hint}` : ""}. We've sent it to our team. You can register once it's approved (usually within 1 working day).`,
        ],
      },
    };
  }
  if (input.companyId && match.company_id !== input.companyId) {
    const name = (match.companies as unknown as { name: string }).name;
    return { fieldErrors: { companyId: [`@${domain} belongs to ${name}. Select ${name} as your company.`] } };
  }

  // Existing account?
  const { data: existingId } = await admin.rpc("auth_user_id_by_email", { p_email: input.corporateEmail });
  if (existingId) {
    const { data: existing } = await admin.from("profiles").select("verification_status").eq("id", existingId).maybeSingle();
    if (existing && existing.verification_status !== "unverified") {
      return { fieldErrors: { corporateEmail: ["An account with this email already exists. Sign in instead."] } };
    }
    // Never-verified leftover: replace it. Deleting (not updating) the auth user
    // also kills any session that was opened with the old password.
    await admin.auth.admin.deleteUser(existingId);
  }

  // Ownership of the mailbox is proven by our OTP, so the Supabase-level email
  // flag is set now; app access is gated on profiles.verification_status.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: input.corporateEmail,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (createErr || !created.user) {
    console.error("createUser failed", createErr);
    const weak = createErr?.code === "weak_password";
    return weak ? { fieldErrors: { password: [createErr!.message] } } : { message: "Could not create your account. Try again." };
  }
  const userId = created.user.id;

  const { error: profileErr } = await admin.from("profiles").insert({
    id: userId,
    full_name: input.fullName,
    corporate_email: input.corporateEmail,
    company_id: match.company_id,
    designation: input.designation,
    work_location_pune: input.workLocation,
  });
  if (profileErr) {
    console.error("profile insert failed", profileErr);
    await admin.auth.admin.deleteUser(userId);
    return { message: "Could not create your profile. Try again." };
  }

  const otp = await issueOtp(admin, { id: userId, email: input.corporateEmail, name: input.fullName }, "verify_email");

  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: input.corporateEmail,
    password: input.password,
  });
  if (signInErr) {
    console.error("post-register sign-in failed", signInErr);
    return { message: "Account created. Sign in to finish verifying your email." };
  }

  redirect(otp.ok ? "/verify" : `/verify?error=${encodeURIComponent(otp.error)}`);
}

// ---------------------------------------------------------------------------
// OTP verification
// ---------------------------------------------------------------------------
const codeSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code");

export async function verifyCorporateOtp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const code = codeSchema.safeParse(formData.get("code"));
  if (!code.success) return { message: code.error.issues[0]!.message };

  const viewer = await getViewer();
  if (!viewer?.profile) redirect("/login");
  if (viewer.profile.verification_status === "verified_employee") redirect("/marketplace");
  if (viewer.profile.verification_status === "suspended") return { message: "This account is suspended." };

  const admin = createAdminClient();
  if (await rateLimited(admin, viewer.email, "verify")) return { message: RATE_LIMITED };

  const result = await consumeOtp(admin, viewer.id, "verify_email", code.data);
  if (!result.ok) return { message: result.error };

  const { error } = await admin
    .from("profiles")
    .update({ verification_status: "verified_employee", verified_at: new Date().toISOString() })
    .eq("id", viewer.id)
    .eq("verification_status", "unverified");
  if (error) {
    console.error("verify update failed", error);
    return { message: "Verified, but we couldn't update your profile. Try again." };
  }
  await admin.from("audit_log").insert({ actor_id: viewer.id, action: "employee.verified", target: viewer.id, meta: { method: "corporate_email_otp" } });

  redirect("/marketplace");
}

export async function resendVerificationOtp(): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer?.profile) redirect("/login");
  if (viewer.profile.verification_status !== "unverified") redirect("/marketplace");

  const admin = createAdminClient();
  if (await rateLimited(admin, viewer.email, "send")) return { message: RATE_LIMITED };

  const r = await issueOtp(admin, { id: viewer.id, email: viewer.email, name: viewer.profile.full_name }, "verify_email");
  return r.ok ? { ok: true, message: `A new code is on its way to ${viewer.email}.` } : { message: r.error };
}

// ---------------------------------------------------------------------------
// Sign in / out
// ---------------------------------------------------------------------------
const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter your work email"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) return { message: "Incorrect email or password." };

  const { data: profile } = await supabase
    .from("profiles").select("verification_status").eq("id", data.user.id).maybeSingle();
  if (!profile) {
    await supabase.auth.signOut();
    return { message: "No CorpConnect profile for this account. Register first." };
  }
  if (profile.verification_status === "suspended") {
    await supabase.auth.signOut();
    return { message: "This account is suspended. Contact support@corpconnect.in." };
  }
  if (profile.verification_status === "unverified") redirect("/verify");
  redirect(safeNext(parsed.data.next));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// ---------------------------------------------------------------------------
// Password reset (code sent to the corporate inbox via Resend)
// ---------------------------------------------------------------------------
export async function requestPasswordReset(_prev: ActionState<{ email: string }>, formData: FormData): Promise<ActionState<{ email: string }>> {
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!email.success) return { fieldErrors: { email: ["Enter your work email"] } };

  const admin = createAdminClient();
  if (await rateLimited(admin, email.data, "send")) return { message: RATE_LIMITED };

  const { data: userId } = await admin.rpc("auth_user_id_by_email", { p_email: email.data });
  if (userId) {
    const { data: profile } = await admin.from("profiles").select("full_name, verification_status").eq("id", userId).maybeSingle();
    if (profile && profile.verification_status !== "suspended") {
      const r = await issueOtp(admin, { id: userId, email: email.data, name: profile.full_name }, "reset_password");
      if (!r.ok && r.error.startsWith("A code was just sent")) return { message: r.error, data: { email: email.data } };
    }
  }
  // Same answer whether or not the account exists (no account enumeration).
  return { ok: true, message: "If that email has a CorpConnect account, a 6-digit code is on its way.", data: { email: email.data } };
}

const resetSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: codeSchema,
  password,
});

export async function resetPassword(_prev: ActionState<{ email: string }>, formData: FormData): Promise<ActionState<{ email: string }>> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData));
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors, data: { email } };

  const admin = createAdminClient();
  if (await rateLimited(admin, parsed.data.email, "verify")) return { message: RATE_LIMITED, data: { email } };

  const { data: userId } = await admin.rpc("auth_user_id_by_email", { p_email: parsed.data.email });
  if (!userId) return { message: "This code has expired. Request a new one.", data: { email } };

  const r = await consumeOtp(admin, userId, "reset_password", parsed.data.code);
  if (!r.ok) return { message: r.error, data: { email } };

  const { error } = await admin.auth.admin.updateUserById(userId, { password: parsed.data.password });
  if (error) return { fieldErrors: { password: [error.message] }, data: { email } };

  // The reset code also proves the mailbox, so finish verification if it was pending.
  await admin.from("profiles")
    .update({ verification_status: "verified_employee", verified_at: new Date().toISOString() })
    .eq("id", userId).eq("verification_status", "unverified");

  redirect("/login?reset=1");
}
