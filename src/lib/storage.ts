import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const PHOTO_BUCKET = "marketplace-photos";
const TTL_SECONDS = 60 * 60;

/**
 * Batch-signs private photo paths with the *user's* client, so storage RLS
 * (verified employees only) decides whether a URL is issued at all.
 */
export async function signPhotos(supabase: SupabaseClient, paths: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return {};
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(unique, TTL_SECONDS);
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const d of data) if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
  return out;
}
