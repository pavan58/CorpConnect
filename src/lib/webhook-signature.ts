import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies a Svix-style signature (what Resend webhooks use).
 * Secret format: "whsec_<base64>". Header `svix-signature` holds one or more
 * space-separated "v1,<base64sig>" entries. Rejects timestamps older than 5 min.
 */
export function verifySvixSignature(opts: {
  secret: string; id: string | null; timestamp: string | null; signature: string | null; body: string; now?: number;
}): boolean {
  const { secret, id, timestamp, signature, body } = opts;
  if (!secret || !id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  const now = Math.floor((opts.now ?? Date.now()) / 1000);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 300) return false;

  const key = Buffer.from(secret.startsWith("whsec_") ? secret.slice(6) : secret, "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const got = Buffer.from(sig, "base64");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}
