import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifySvixSignature } from "@/lib/webhook-signature";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resend → CorpConnect delivery events. Hard bounces and spam complaints are
 * added to email_suppressions so we stop sending OTPs to dead or hostile
 * addresses (protects the sending domain's reputation).
 * Configure in Resend: Webhooks → https://corpconnect.in/api/webhooks/resend,
 * events email.bounced + email.complained. Put the signing secret in RESEND_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const ok = verifySvixSignature({
    secret: process.env.RESEND_WEBHOOK_SECRET ?? "",
    id: req.headers.get("svix-id"),
    timestamp: req.headers.get("svix-timestamp"),
    signature: req.headers.get("svix-signature"),
    body,
  });
  if (!ok) return NextResponse.json({ error: "invalid signature" }, { status: 401 });

  let event: { type?: string; data?: { to?: string[] | string; bounce?: { type?: string } } };
  try { event = JSON.parse(body); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }

  const to = ([] as string[]).concat(event.data?.to ?? []).map((e) => e.toLowerCase().trim()).filter(Boolean);
  const permanent = event.type === "email.bounced" && (event.data?.bounce?.type ?? "Permanent") !== "Transient";
  const reason = event.type === "email.complained" ? "complaint" : permanent ? "hard_bounce" : null;

  if (reason && to.length) {
    const admin = createAdminClient();
    await admin.from("email_suppressions").upsert(to.map((email) => ({ email, reason })), { onConflict: "email", ignoreDuplicates: true });
  }
  return NextResponse.json({ received: true });
}
