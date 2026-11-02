import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const formatInr = (n: number) => inr.format(n);

const rtf = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });
export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(s);
  if (abs < 60) return rtf.format(s, "second");
  if (abs < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(s / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(s / 86400), "day");
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function initials(name: string) {
  const words = name.replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?";
}

/** Only allow same-origin relative redirects (prevents open redirects via ?next=). */
export function safeNext(next: unknown, fallback = "/marketplace") {
  return typeof next === "string" && /^\/(?!\/|\\)/.test(next) ? next : fallback;
}
