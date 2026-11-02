import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { generateOtp, hashOtp, otpMatches } from "@/lib/otp";

const SECRET = "x".repeat(40);
const USER = "00000000-0000-0000-0000-0000000000a1";

describe("otp", () => {
  it("generates 6 digits, zero-padded", () => {
    for (let i = 0; i < 500; i++) expect(generateOtp()).toMatch(/^\d{6}$/);
  });
  it("matches only the same code, user and purpose", () => {
    const h = hashOtp(USER, "verify_email", "042137", SECRET);
    expect(otpMatches(h, USER, "verify_email", "042137", SECRET)).toBe(true);
    expect(otpMatches(h, USER, "verify_email", "042138", SECRET)).toBe(false);
    expect(otpMatches(h, USER, "reset_password", "042137", SECRET)).toBe(false);
    expect(otpMatches(h, "00000000-0000-0000-0000-0000000000b2", "verify_email", "042137", SECRET)).toBe(false);
    expect(otpMatches(h, USER, "verify_email", "042137", "y".repeat(40))).toBe(false);
  });
  it("never stores the code in clear", () => {
    expect(hashOtp(USER, "verify_email", "123456", SECRET)).not.toContain("123456");
  });
});
