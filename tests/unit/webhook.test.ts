import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifySvixSignature } from "@/lib/webhook-signature";

const raw = Buffer.from("super-secret-key-material");
const secret = `whsec_${raw.toString("base64")}`;
const sign = (id: string, ts: string, body: string) => createHmac("sha256", raw).update(`${id}.${ts}.${body}`).digest("base64");

describe("verifySvixSignature", () => {
  const now = 1_790_000_000_000;
  const ts = String(now / 1000);
  const body = '{"type":"email.bounced"}';
  it("accepts a valid signature", () =>
    expect(verifySvixSignature({ secret, id: "msg_1", timestamp: ts, signature: `v1,${sign("msg_1", ts, body)}`, body, now })).toBe(true));
  it("rejects a tampered body", () =>
    expect(verifySvixSignature({ secret, id: "msg_1", timestamp: ts, signature: `v1,${sign("msg_1", ts, body)}`, body: body + " ", now })).toBe(false));
  it("rejects stale timestamps", () =>
    expect(verifySvixSignature({ secret, id: "msg_1", timestamp: ts, signature: `v1,${sign("msg_1", ts, body)}`, body, now: now + 10 * 60_000 })).toBe(false));
  it("rejects missing headers", () =>
    expect(verifySvixSignature({ secret, id: null, timestamp: ts, signature: "v1,x", body, now })).toBe(false));
});

import { safeNext } from "@/lib/utils";
describe("safeNext", () => {
  it("allows relative paths", () => expect(safeNext("/jobs/1")).toBe("/jobs/1"));
  it.each(["//evil.com", "https://evil.com", "/\\evil.com", ""])("blocks %s", (v) => expect(safeNext(v)).toBe("/marketplace"));
});
