// Corporate-email rules. Pure functions: shared by the register form (instant
// feedback) and the server action (the actual check).

/** Free / personal mailbox providers. Never accepted as proof of employment. */
export const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.in", "yahoo.in", "ymail.com", "rocketmail.com",
  "outlook.com", "outlook.in", "hotmail.com", "hotmail.co.in", "live.com", "live.in", "msn.com",
  "icloud.com", "me.com", "mac.com", "aol.com", "proton.me", "protonmail.com", "pm.me",
  "zoho.com", "zohomail.in", "gmx.com", "gmx.net", "mail.com", "yandex.com", "yandex.ru",
  "rediffmail.com", "rediff.com", "tutanota.com", "tuta.io", "fastmail.com", "hey.com",
  "duck.com", "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.org",
]);

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function emailDomain(email: string): string | null {
  const m = /^[^\s@]+@([a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,})$/.exec(normalizeEmail(email));
  return m ? m[1]! : null;
}

export function isPublicEmailDomain(domain: string) {
  const d = domain.toLowerCase();
  if (PUBLIC_EMAIL_DOMAINS.has(d)) return true;
  // yahoo.co.uk, hotmail.fr, outlook.de ...
  return /^(yahoo|hotmail|outlook|live|gmail)\.[a-z.]+$/.test(d);
}

/**
 * Domains to look up in company_domains, most specific first, so that
 * `ravi@in.ibm.com` matches `in.ibm.com` and then `ibm.com`. Stops before the
 * public suffix (never matches bare `com` / `co.in`).
 */
export function domainCandidates(domain: string): string[] {
  const parts = domain.toLowerCase().split(".");
  const out: string[] = [];
  const minParts = /\.(co|com|net|org|gov|ac)\.[a-z]{2}$/.test(domain) ? 3 : 2;
  for (let i = 0; parts.length - i >= minParts; i++) out.push(parts.slice(i).join("."));
  return out;
}
