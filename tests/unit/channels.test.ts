import { describe, expect, it } from "vitest";
import { CHANNELS, CAMPAIGN, channelUrl } from "@/features/marketing/channels";
import { attributionFromParams } from "@/lib/attribution";

describe("launch channels", () => {
  it("have unique src slugs that fit the DB constraint", () => {
    const srcs = CHANNELS.map((c) => c.src);
    expect(new Set(srcs).size).toBe(srcs.length);
    srcs.forEach((s) => expect(s).toMatch(/^[a-z0-9_-]{1,60}$/));
  });
  it("build tracked URLs that the middleware will attribute correctly", () => {
    for (const c of CHANNELS) {
      const u = new URL(channelUrl("https://corpconnect.it.com", c));
      expect(u.host).toBe("corpconnect.it.com");
      expect(attributionFromParams(u.searchParams)).toEqual({ source: c.src, campaign: CAMPAIGN, ref: undefined });
    }
  });
});
