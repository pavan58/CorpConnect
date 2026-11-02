"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { verifiedOrNull } from "@/lib/auth/guards";
import type { ActionState } from "@/lib/action-state";
import { jobSchema, referralSchema } from "./schema";

const uuid = z.string().uuid();

export async function createJob(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await verifiedOrNull();
  if (!viewer) return { message: "Only verified employees can post jobs." };
  const parsed = jobSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("job_listings")
    .insert({
      posted_by: viewer.id,
      company_id: viewer.profile.company_id, // RLS also enforces: only your verified employer
      title: v.title,
      description: v.description,
      employment_type: v.employmentType,
      work_mode: v.workMode,
      experience_min: v.experienceMin,
      experience_max: v.experienceMax,
      hub_code: v.hubCode,
      apply_url: v.applyUrl || null,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("create job failed", error);
    return { message: "Could not post the job. Try again." };
  }
  revalidatePath("/jobs");
  redirect(`/jobs/${data.id}`);
}

export async function setJobStatus(jobId: string, status: "open" | "closed") {
  const viewer = await verifiedOrNull();
  if (!viewer || !uuid.safeParse(jobId).success) return;
  const supabase = await createClient();
  await supabase.from("job_listings").update({ status }).eq("id", jobId).eq("posted_by", viewer.id);
  revalidatePath(`/jobs/${jobId}`);
}

export async function requestReferral(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await verifiedOrNull();
  if (!viewer) return { message: "Only verified employees can request referrals." };
  const parsed = referralSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.from("referral_requests").insert({
    job_id: parsed.data.jobId,
    requester_id: viewer.id,
    referrer_id: viewer.id, // overwritten by the DB trigger with the job poster
    message: parsed.data.message,
    resume_url: parsed.data.resumeUrl || null,
  });
  if (error) {
    if (error.code === "23505") return { message: "You've already requested a referral for this job." };
    return { message: error.message.includes("not open") ? "This job is no longer accepting referrals." : "Could not send your request. Try again." };
  }
  revalidatePath(`/jobs/${parsed.data.jobId}`);
  revalidatePath("/jobs/referrals");
  return { ok: true, message: "Referral requested. You'll see updates under My referrals." };
}

const decisionSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["in_review", "referred", "declined"]),
  note: z.string().trim().max(500).optional(),
});

export async function decideReferral(formData: FormData) {
  const viewer = await verifiedOrNull();
  const parsed = decisionSchema.safeParse(Object.fromEntries(formData));
  if (!viewer || !parsed.success) return;
  const supabase = await createClient();
  await supabase
    .from("referral_requests")
    .update({ status: parsed.data.status, referrer_note: parsed.data.note || null })
    .eq("id", parsed.data.requestId)
    .eq("referrer_id", viewer.id);
  revalidatePath("/jobs/referrals");
}

export async function withdrawReferral(requestId: string) {
  const viewer = await verifiedOrNull();
  if (!viewer || !uuid.safeParse(requestId).success) return;
  const supabase = await createClient();
  await supabase.from("referral_requests").update({ status: "withdrawn" })
    .eq("id", requestId).eq("requester_id", viewer.id).in("status", ["requested", "in_review"]);
  revalidatePath("/jobs/referrals");
}
