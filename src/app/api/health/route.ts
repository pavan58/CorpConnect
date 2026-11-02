import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TIMEOUT_MS = 3000;

async function timed(fn: () => Promise<void>) {
  const t = performance.now();
  try {
    await fn();
    return { ok: true, ms: Math.round(performance.now() - t) };
  } catch (e) {
    return { ok: false, ms: Math.round(performance.now() - t), error: e instanceof Error ? e.message : "error" };
  }
}

/** Used by the deploy workflow as a smoke test before promoting a deployment. */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const config = {
    ok: !!(url && key && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.OTP_SECRET && process.env.RESEND_API_KEY),
    ms: 0,
  };
  if (!url || !key) {
    return NextResponse.json({ status: "unavailable", checks: { config } }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });
  const started = performance.now();

  const [database, storage, email] = await Promise.all([
    timed(async () => {
      const { error } = await sb.from("pune_zones").select("code").limit(1).abortSignal(AbortSignal.timeout(TIMEOUT_MS));
      if (error) throw new Error(error.message);
    }),
    timed(async () => {
      const { error } = await sb.storage.getBucket("marketplace-photos");
      if (error) throw new Error(error.message);
    }),
    timed(async () => {
      // Any non-5xx answer means Resend is reachable (a sending-only key gets 401 here, which is fine).
      const r = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY ?? ""}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
      if (r.status >= 500) throw new Error(`resend ${r.status}`);
    }),
  ]);

  const healthy = config.ok && database.ok && storage.ok && email.ok;
  return NextResponse.json(
    {
      status: healthy ? "ok" : "unavailable",
      totalMs: Math.round(performance.now() - started),
      checks: { config, database, storage, email },
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
