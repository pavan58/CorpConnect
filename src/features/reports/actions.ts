"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { verifiedOrNull } from "@/lib/auth/guards";
import type { ActionState } from "@/lib/action-state";

const schema = z.object({
  targetType: z.enum(["listing", "job", "post", "comment", "user", "message"]),
  targetId: z.string().uuid(),
  reason: z.enum(["spam", "scam", "offensive", "fake_profile", "prohibited_item", "other"]),
  details: z.string().trim().max(1000).optional(),
});

export async function reportContent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await verifiedOrNull();
  if (!viewer) return { message: "Only verified employees can report." };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Pick a reason." };
  const supabase = await createClient();
  const { error } = await supabase.from("user_reports").insert({
    reporter_id: viewer.id,
    target_type: parsed.data.targetType,
    target_id: parsed.data.targetId,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
  });
  if (error) return { message: "Could not send the report. Try again." };
  return { ok: true, message: "Thanks. Our moderators will review this." };
}
