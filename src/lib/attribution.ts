// Sign-up attribution: which channel (QR flyer, LinkedIn ad, Reddit post, invite
// link…) brought a member. Captured from the first landing URL into a cookie by
// middleware, read once by registerEmployee. Pure helpers, no server-only deps.

export const ATTRIBUTION_COOKIE = "cc_attrib";
export const ATTRIBUTION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type Attribution = { source?: string; campaign?: string; ref?: string };

const slug = (v: string | null | undefined, max = 60) => {
  const s = (v ?? "").toLowerCase().trim().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, max);
  return s || undefined;
};
const inviteCode = (v: string | null | undefined) => {
  const s = (v ?? "").toLowerCase().trim();
  return /^[a-z0-9]{8}$/.test(s) ? s : undefined;
};

/** Reads ?src= / ?utm_source= / ?utm_campaign= / ?ref= from a URL. */
export function attributionFromParams(params: URLSearchParams): Attribution | null {
  const a: Attribution = {
    source: slug(params.get("src") ?? params.get("utm_source")),
    campaign: slug(params.get("utm_campaign") ?? params.get("c")),
    ref: inviteCode(params.get("ref")),
  };
  if (a.ref && !a.source) a.source = "invite";
  return a.source || a.campaign || a.ref ? a : null;
}

export function encodeAttribution(a: Attribution) {
  return encodeURIComponent(JSON.stringify(a));
}

export function decodeAttribution(raw: string | undefined): Attribution {
  if (!raw) return {};
  try {
    const v = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    return {
      source: slug(typeof v.source === "string" ? v.source : undefined),
      campaign: slug(typeof v.campaign === "string" ? v.campaign : undefined),
      ref: inviteCode(typeof v.ref === "string" ? v.ref : undefined),
    };
  } catch {
    return {};
  }
}
