import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

export type OtpPurpose = "verify_email" | "reset_password";

export function generateOtp(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Codes are stored as HMACs bound to user + purpose, never in plain text. */
export function hashOtp(userId: string, purpose: OtpPurpose, code: string, secret = serverEnv.otpSecret()) {
  return createHmac("sha256", secret).update(`${purpose}:${userId}:${code}`).digest("hex");
}

export function otpMatches(storedHash: string, userId: string, purpose: OtpPurpose, code: string, secret?: string) {
  const a = Buffer.from(storedHash, "hex");
  const b = Buffer.from(hashOtp(userId, purpose, code, secret), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
