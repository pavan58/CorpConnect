"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifiedOrNull } from "@/lib/auth/guards";

/**
 * Every admin action re-checks the caller's role on the server. Do not rely
 * on middleware or on the admin layout alone — server actions are public
 * HTTP endpoints.
 */
async function assertStaff(level: "moderator" | "admin" = "moderator") {
  const viewer = await verifiedOrNull();
  const role = viewer?.profile.role;
  const ok = level === "admin" ? role === "admin" : role === "admin" || role === "moderator";
  if (!viewer || !ok) throw new Error("Forbidden");
  return viewer;
}

async function audit(actorId: string, action: string, target: string, meta: Record<string, unknown> = {}) {
  await createAdminClient().from("audit_log").insert({ actor_id: actorId, action, target, meta });
}

const uuid = z.string().uuid();

const resolveSchema = z.object({
  reportId: z.string().uuid(),
  outcome: z.enum(["actioned", "dismissed"]),
});

export async function resolveReport(formData: FormData) {
  const viewer = await assertStaff();
  const parsed = resolveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const admin = createAdminClient();
  const { data: report } = await admin.from("user_reports").select("id, target_type, target_id").eq("id", parsed.data.reportId).maybeSingle();
  if (!report) return;

  if (parsed.data.outcome === "actioned") {
    const t = report.target_id;
    switch (report.target_type) {
      case "listing": await admin.from("product_listings").update({ status: "removed" }).eq("id", t); break;
      case "post": await admin.from("community_posts").update({ is_removed: true }).eq("id", t); break;
      case "comment": await admin.from("post_comments").delete().eq("id", t); break;
      case "job": await admin.from("job_listings").update({ status: "closed" }).eq("id", t); break;
      case "message": await admin.from("messages").delete().eq("id", t); break;
      case "user":
        if (viewer.profile.role === "admin") await admin.from("profiles").update({ verification_status: "suspended" }).eq("id", t).neq("role", "admin");
        break;
    }
  }
  await admin.from("user_reports").update({
    status: parsed.data.outcome,
    resolved_by: viewer.id,
    resolved_at: new Date().toISOString(),
  }).eq("id", report.id);
  await audit(viewer.id, `report.${parsed.data.outcome}`, `${report.target_type}:${report.target_id}`, { report: report.id });
  revalidatePath("/admin");
}

const approveSchema = z.object({
  requestId: z.string().uuid(),
  companyId: z.string().optional(),
  newCompanyName: z.string().trim().max(120).optional(),
});

export async function approveDomain(formData: FormData) {
  const viewer = await assertStaff("admin");
  const parsed = approveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const admin = createAdminClient();
  const { data: req } = await admin.from("company_domain_requests").select("id, domain").eq("id", parsed.data.requestId).eq("status", "pending").maybeSingle();
  if (!req) return;

  let companyId = uuid.safeParse(parsed.data.companyId).success ? parsed.data.companyId! : null;
  if (!companyId && parsed.data.newCompanyName && parsed.data.newCompanyName.length >= 2) {
    const slug = parsed.data.newCompanyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
    const { data: created } = await admin.from("companies")
      .upsert({ slug, name: parsed.data.newCompanyName }, { onConflict: "slug" }).select("id").single();
    companyId = created?.id ?? null;
  }
  if (!companyId) return;

  await admin.from("company_domains").upsert({ domain: req.domain, company_id: companyId }, { onConflict: "domain" });
  const now = new Date().toISOString();
  await admin.from("company_domain_requests").update({ status: "approved", resolved_at: now }).eq("domain", req.domain).eq("status", "pending");
  await audit(viewer.id, "domain.approved", req.domain, { companyId });
  revalidatePath("/admin");
}

export async function rejectDomain(requestId: string) {
  const viewer = await assertStaff("admin");
  if (!uuid.safeParse(requestId).success) return;
  const admin = createAdminClient();
  const { data: req } = await admin.from("company_domain_requests").select("domain").eq("id", requestId).maybeSingle();
  if (!req) return;
  await admin.from("company_domain_requests").update({ status: "rejected", resolved_at: new Date().toISOString() }).eq("domain", req.domain).eq("status", "pending");
  await audit(viewer.id, "domain.rejected", req.domain);
  revalidatePath("/admin");
}

export async function setUserStatus(userId: string, status: "suspended" | "verified_employee") {
  const viewer = await assertStaff("admin");
  if (!uuid.safeParse(userId).success || userId === viewer.id) return;
  const admin = createAdminClient();
  await admin.from("profiles").update({ verification_status: status }).eq("id", userId).neq("verification_status", "unverified");
  await audit(viewer.id, `user.${status}`, userId);
  revalidatePath("/admin");
}

export async function setUserRole(userId: string, role: "member" | "moderator") {
  const viewer = await assertStaff("admin");
  if (!uuid.safeParse(userId).success || userId === viewer.id) return;
  const admin = createAdminClient();
  await admin.from("profiles").update({ role }).eq("id", userId).neq("role", "admin");
  await audit(viewer.id, `user.role.${role}`, userId);
  revalidatePath("/admin");
}
