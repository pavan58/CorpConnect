"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { verifiedOrNull } from "@/lib/auth/guards";
import { HUBS, codes } from "@/lib/pune";
import type { ActionState } from "@/lib/action-state";

const schema = z.object({
  fullName: z.string().trim().min(2).max(80),
  designation: z.string().trim().min(2).max(80),
  workLocation: z.enum(codes(HUBS)),
  bio: z.string().trim().max(500).optional(),
});

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await verifiedOrNull();
  if (!viewer) return { message: "Not signed in." };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  // Column grants only allow these four fields; company, email, role and
  // verification status cannot be changed from the client.
  const { error } = await supabase.from("profiles").update({
    full_name: parsed.data.fullName,
    designation: parsed.data.designation,
    work_location_pune: parsed.data.workLocation,
    bio: parsed.data.bio || null,
  }).eq("id", viewer.id);
  if (error) return { message: "Could not save. Try again." };
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved." };
}
