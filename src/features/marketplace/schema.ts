import { z } from "zod";
import { CATEGORIES, CONDITIONS, PICKUP_POINTS, ZONES, codes } from "@/lib/pune";

export const PHOTO_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
export const MAX_PHOTOS = 6;

export const listingSchema = z
  .object({
    title: z.string().trim().min(4, "At least 4 characters").max(100),
    description: z.string().trim().min(10, "Add a few details (at least 10 characters)").max(2000),
    category: z.enum(codes(CATEGORIES), { errorMap: () => ({ message: "Pick a category" }) }),
    condition: z.enum(codes(CONDITIONS), { errorMap: () => ({ message: "Pick a condition" }) }),
    priceInr: z.coerce.number({ invalid_type_error: "Enter a price" }).int("Whole rupees only").min(0).max(1_000_000, "Max ₹10,00,000"),
    negotiable: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
    zoneCode: z.enum(codes(ZONES), { errorMap: () => ({ message: "Pick a Pune zone" }) }),
    pickupPoint: z.enum(codes(PICKUP_POINTS), { errorMap: () => ({ message: "Pick a handover spot" }) }),
    imagePaths: z.preprocess(
      (v) => { try { return JSON.parse(String(v ?? "[]")); } catch { return null; } },
      z.array(z.string().regex(PHOTO_PATH)).min(1, "Add at least one photo").max(MAX_PHOTOS),
    ),
  })
  .refine((v) => PICKUP_POINTS.some((p) => p.code === v.pickupPoint && p.zone === v.zoneCode), {
    path: ["pickupPoint"],
    message: "That handover spot isn't in the selected zone",
  });

export type ListingInput = z.infer<typeof listingSchema>;
