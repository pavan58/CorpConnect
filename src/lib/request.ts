import "server-only";
import { headers } from "next/headers";

/** Client IP as seen by Vercel's edge (first hop of x-forwarded-for). */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}
