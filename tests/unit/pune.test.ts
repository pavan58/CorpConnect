import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { HUBS, PICKUP_POINTS, ZONES } from "@/lib/pune";
import { listingSchema } from "@/features/marketplace/schema";

const sql = readFileSync(path.join(__dirname, "../../supabase/migrations/20261101000000_pune_mvp.sql"), "utf8");
const seeded = (table: string) => {
  const block = sql.split(`insert into public.${table} `)[1]!.split(";")[0]!;
  return [...block.matchAll(/\(\s*'([a-z0-9_]+)',\s*'([a-z0-9_]+)'/g)].map((m) => [m[1], m[2]]);
};

describe("Pune reference data stays in sync with the migration", () => {
  it("zones", () => {
    const block = sql.split("insert into public.pune_zones ")[1]!.split(";")[0]!;
    expect([...block.matchAll(/\(\s*'([a-z0-9_]+)',/g)].map((m) => m[1])).toEqual(ZONES.map((z) => z.code));
  });
  it("hubs", () => expect(seeded("pune_hubs")).toEqual(HUBS.map((h) => [h.code, h.zone])));
  it("pickup points", () => expect(seeded("pickup_points")).toEqual(PICKUP_POINTS.map((p) => [p.code, p.zone])));
});

describe("listingSchema", () => {
  const base = {
    title: "MacBook Air M2", description: "Barely used, with box", category: "laptops", condition: "like_new",
    priceInr: "72000", zoneCode: "kharadi_magarpatta", pickupPoint: "eon_gate1",
    imagePaths: JSON.stringify(["00000000-0000-0000-0000-0000000000a1/11111111-1111-1111-1111-111111111111.jpg"]),
  };
  it("accepts a valid Pune listing", () => expect(listingSchema.safeParse(base).success).toBe(true));
  it("rejects a pickup point outside the zone", () => expect(listingSchema.safeParse({ ...base, pickupPoint: "hjw_ph1_circle" }).success).toBe(false));
  it("rejects listings without photos", () => expect(listingSchema.safeParse({ ...base, imagePaths: "[]" }).success).toBe(false));
  it("rejects path traversal in photo paths", () =>
    expect(listingSchema.safeParse({ ...base, imagePaths: JSON.stringify(["../etc/passwd"]) }).success).toBe(false));
});
