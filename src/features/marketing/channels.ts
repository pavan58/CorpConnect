// Launch channels. Each gets its own tracked link (and QR code), so the admin
// "Sign-ups by channel" table shows which placements actually convert.

export type Angle = "sell" | "referrals" | "general";

export type Channel = {
  src: string;           // stored as profiles.signup_source
  label: string;
  group: "On-ground" | "Commute" | "Online" | "Community";
  angle: Angle;
  placement: string;
};

export const CAMPAIGN = "pune-launch";

export const CHANNELS: Channel[] = [
  { src: "hjw-canteen", label: "Hinjawadi food courts (Ph 1–3)", group: "On-ground", angle: "sell", placement: "Tabletop standees / canteen screens" },
  { src: "eon-canteen", label: "EON IT Park food court, Kharadi", group: "On-ground", angle: "sell", placement: "Tabletop standees / canteen screens" },
  { src: "magarpatta-canteen", label: "Magarpatta Cybercity food court", group: "On-ground", angle: "sell", placement: "Tabletop standees / canteen screens" },
  { src: "commerzone-canteen", label: "Commerzone Yerwada food court", group: "On-ground", angle: "sell", placement: "Tabletop standees / canteen screens" },
  { src: "gate-hjw", label: "Hinjawadi gate flyers", group: "On-ground", angle: "general", placement: "Scan cards at lunch / evening exit" },
  { src: "gate-kharadi", label: "EON / WTC Kharadi gate flyers", group: "On-ground", angle: "general", placement: "Scan cards at lunch / evening exit" },
  { src: "metro-viman", label: "Viman Nagar / Kalyani Nagar metro", group: "Commute", angle: "general", placement: "Station panels" },
  { src: "metro-pcmc", label: "PCMC metro line", group: "Commute", angle: "general", placement: "Station panels" },
  { src: "cab-screens", label: "Corporate cab / shuttle screens", group: "Commute", angle: "general", placement: "In-cab screens, shuttle seat-backs" },
  { src: "reddit-pune", label: "Reddit r/pune founder post", group: "Online", angle: "general", placement: "Link in post" },
  { src: "reddit-devindia", label: "Reddit r/developersIndia", group: "Online", angle: "referrals", placement: "Link in post" },
  { src: "linkedin-referrals", label: "LinkedIn ads: referrals", group: "Online", angle: "referrals", placement: "Ad destination URL" },
  { src: "linkedin-marketplace", label: "LinkedIn ads: marketplace", group: "Online", angle: "sell", placement: "Ad destination URL" },
  { src: "word-of-mouth", label: "Blind / Grapevine / WhatsApp mentions", group: "Community", angle: "general", placement: "Shared link" },
];

const PATH: Record<Angle, string> = { sell: "/sell", referrals: "/referrals", general: "/" };

export function channelUrl(base: string, c: Channel) {
  const u = new URL(PATH[c.angle], base);
  u.searchParams.set("src", c.src);
  u.searchParams.set("utm_campaign", CAMPAIGN);
  return u.toString();
}

export const COPY: Record<Angle, { headline: string; sub: string; cta: string; points: string[] }> = {
  sell: {
    headline: "Selling your iPhone or ThinkPad?",
    sub: "Meet verified tech peers right at your campus gate. No scam callers, no random strangers.",
    cta: "Scan to list it free",
    points: ["Only work-email-verified buyers", "Hand over at your campus gate", "Chat in-app, keep your number private"],
  },
  referrals: {
    headline: "Need an internal referral?",
    sub: "Ask verified engineers at Pune's top MNC and product companies directly. Track every request.",
    cta: "Scan to find a referrer",
    points: ["Openings posted by real employees", "Request directly, no cold InMails", "Track: requested → referred"],
  },
  general: {
    headline: "Pune's private network for verified techies",
    sub: "Buy & sell gear safely, get internal referrals, join local tech communities. Verified by work email.",
    cta: "Scan to join free",
    points: ["Electronics marketplace", "Internal job referrals", "Hinjawadi, Kharadi, Magarpatta & more"],
  },
};
