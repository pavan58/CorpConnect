import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";

/**
 * Service-role client. Bypasses RLS — only use it in server actions after
 * checking who the caller is, and never pass its results to the client unfiltered.
 */
export function createAdminClient() {
  return createClient(serverEnv.supabaseUrl(), serverEnv.serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
