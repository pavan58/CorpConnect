import { describe, expect, it } from "vitest";
import { attributionFromParams, decodeAttribution, encodeAttribution } from "@/lib/attribution";

describe("attribution", () => {
  it("reads src/utm and slugifies", () =>
    expect(attributionFromParams(new URLSearchParams("utm_source=LinkedIn Ads&utm_campaign=Launch_Nov")))
      .toEqual({ source: "linkedin-ads", campaign: "launch_nov", ref: undefined }));
  it("invite ref implies source=invite", () =>
    expect(attributionFromParams(new URLSearchParams("ref=AB12cd34"))).toEqual({ source: "invite", campaign: undefined, ref: "ab12cd34" }));
  it("rejects bad invite codes", () => expect(attributionFromParams(new URLSearchParams("ref=../../x"))).toBeNull());
  it("returns null without params", () => expect(attributionFromParams(new URLSearchParams("q=laptop"))).toBeNull());
  it("round-trips and survives tampering", () => {
    const a = { source: "hjw-canteen", campaign: "launch", ref: "ab12cd34" };
    expect(decodeAttribution(encodeAttribution(a))).toEqual(a);
    expect(decodeAttribution(encodeURIComponent(JSON.stringify({ source: "<script>", ref: "x" })))).toEqual({ source: "script", campaign: undefined, ref: undefined });
    expect(decodeAttribution("not-json")).toEqual({});
  });
});
