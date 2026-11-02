import { describe, expect, it } from "vitest";
import { domainCandidates, emailDomain, isPublicEmailDomain } from "@/lib/email-domain";

describe("emailDomain", () => {
  it("extracts and lowercases", () => expect(emailDomain("  Ravi.K@TCS.com ")).toBe("tcs.com"));
  it("rejects junk", () => {
    expect(emailDomain("no-at-sign")).toBeNull();
    expect(emailDomain("a@b")).toBeNull();
    expect(emailDomain("a@@tcs.com")).toBeNull();
  });
});

describe("isPublicEmailDomain", () => {
  it.each(["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "rediffmail.com", "yahoo.co.uk", "hotmail.fr"])(
    "blocks %s", (d) => expect(isPublicEmailDomain(d)).toBe(true));
  it.each(["tcs.com", "infosys.com", "wipro.com", "cognizant.com", "in.ibm.com", "db.com"])(
    "allows %s", (d) => expect(isPublicEmailDomain(d)).toBe(false));
});

describe("domainCandidates", () => {
  it("walks up subdomains", () => expect(domainCandidates("in.ibm.com")).toEqual(["in.ibm.com", "ibm.com"]));
  it("never yields a bare TLD", () => expect(domainCandidates("tcs.com")).toEqual(["tcs.com"]));
  it("respects second-level public suffixes", () => expect(domainCandidates("mail.acme.co.in")).toEqual(["mail.acme.co.in", "acme.co.in"]));
});
