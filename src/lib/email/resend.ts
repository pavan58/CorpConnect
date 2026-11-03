import "server-only";
import { serverEnv } from "@/lib/env";

type SendArgs = { to: string; subject: string; html: string; text: string; idempotencyKey?: string };

/**
 * Sends one transactional email through the Resend REST API.
 * Without RESEND_API_KEY outside production, the message is logged instead so
 * the OTP flow works on a laptop.
 */
export async function sendEmail({ to, subject, html, text, idempotencyKey }: SendArgs): Promise<{ ok: boolean; error?: string }> {
  const key = serverEnv.resendApiKey();
  if (!key) {
    if (serverEnv.isProd()) return { ok: false, error: "Email is not configured" };
    console.info(`\n[dev email] to=${to}\nsubject: ${subject}\n${text}\n`);
    return { ok: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify({ from: serverEnv.resendFrom(), to: [to], subject, html, text }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("resend send failed", res.status, body.slice(0, 300));
      return { ok: false, error: `Email provider returned ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("resend send error", e);
    return { ok: false, error: "Could not reach email provider" };
  }
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function otpEmail(opts: { name: string; code: string; purpose: "verify_email" | "reset_password" }) {
  const verifying = opts.purpose === "verify_email";
  const subject = verifying
    ? `${opts.code} is your CorpConnect verification code`
    : `${opts.code} is your CorpConnect password reset code`;
  const lead = verifying
    ? "Use this code to confirm your work email and unlock CorpConnect Pune."
    : "Use this code to reset your CorpConnect password.";
  const text = `Hi ${opts.name},\n\n${lead}\n\n${opts.code}\n\nThe code expires in 10 minutes. CorpConnect will never ask you for this code by phone or chat. If you didn't request it, ignore this email.\n\n— CorpConnect, Pune`;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px" cellpadding="0" cellspacing="0">
<tr><td style="font-size:18px;font-weight:700;color:#533afd">CorpConnect · Pune</td></tr>
<tr><td style="padding-top:24px;font-size:15px;line-height:22px">Hi ${escape(opts.name)},<br>${lead}</td></tr>
<tr><td style="padding:24px 0;font-size:34px;font-weight:700;letter-spacing:10px;font-family:ui-monospace,Menlo,Consolas,monospace">${opts.code}</td></tr>
<tr><td style="font-size:13px;line-height:20px;color:#6b7280">This code expires in 10 minutes. CorpConnect will never ask you for this code by phone or chat. If you didn't request it, you can ignore this email.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, html, text };
}
