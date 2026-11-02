import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Viewer = {
  id: string;
  email: string;
  profile: {
    id: string;
    full_name: string;
    designation: string;
    work_location_pune: string;
    bio: string | null;
    company_id: string;
    verification_status: "unverified" | "verified_employee" | "suspended";
    role: "member" | "moderator" | "admin";
    company: { name: string; slug: string } | null;
  } | null;
};

export const PROFILE_COLUMNS =
  "id, full_name, designation, work_location_pune, bio, company_id, verification_status, role, company:companies(name, slug)";

/** Current user + profile, memoised per request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", user.id).maybeSingle();
  return { id: user.id, email: user.email ?? "", profile: (profile as Viewer["profile"]) ?? null };
});

/** For pages inside the app: signed in AND verified via corporate OTP. */
export async function requireVerified() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const status = viewer.profile?.verification_status;
  if (status === "suspended") redirect("/login?error=suspended");
  if (status !== "verified_employee") redirect("/verify");
  return viewer as Viewer & { profile: NonNullable<Viewer["profile"]> };
}

export async function requireAdmin() {
  const viewer = await requireVerified();
  if (viewer.profile.role !== "admin" && viewer.profile.role !== "moderator") redirect("/marketplace");
  return viewer;
}

/** Same as requireVerified but returns null instead of redirecting (for server actions). */
export async function verifiedOrNull() {
  const viewer = await getViewer();
  return viewer?.profile?.verification_status === "verified_employee"
    ? (viewer as Viewer & { profile: NonNullable<Viewer["profile"]> })
    : null;
}
