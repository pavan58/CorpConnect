"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { verifiedOrNull } from "@/lib/auth/guards";
import { PHOTO_BUCKET } from "@/lib/storage";
import type { ActionState } from "@/lib/action-state";
import { listingSchema } from "./schema";

const NOT_VERIFIED: ActionState = { message: "Only verified employees can do that." };
const uuid = z.string().uuid();

export async function createListing(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await verifiedOrNull();
  if (!viewer) return NOT_VERIFIED;

  const parsed = listingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;

  if (v.imagePaths.some((p) => !p.startsWith(`${viewer.id}/`))) {
    return { fieldErrors: { imagePaths: ["Photo upload failed. Please re-add your photos."] } };
  }

  const supabase = await createClient();
  const { data: listing, error } = await supabase
    .from("product_listings")
    .insert({
      seller_id: viewer.id,
      title: v.title,
      description: v.description,
      category: v.category,
      condition: v.condition,
      price_inr: v.priceInr,
      negotiable: v.negotiable,
      zone_code: v.zoneCode,
      pickup_point: v.pickupPoint,
    })
    .select("id")
    .single();
  if (error || !listing) {
    console.error("create listing failed", error);
    return { message: "Could not publish your listing. Try again." };
  }

  const { error: imgErr } = await supabase
    .from("product_images")
    .insert(v.imagePaths.map((storage_path, position) => ({ listing_id: listing.id, storage_path, position })));
  if (imgErr) {
    console.error("attach images failed", imgErr);
    await supabase.from("product_listings").delete().eq("id", listing.id);
    return { message: "Could not attach your photos. Try again." };
  }

  revalidatePath("/marketplace");
  redirect(`/marketplace/${listing.id}`);
}

export async function setListingStatus(listingId: string, status: "active" | "reserved" | "sold") {
  const viewer = await verifiedOrNull();
  if (!viewer || !uuid.safeParse(listingId).success || !["active", "reserved", "sold"].includes(status)) return;
  const supabase = await createClient();
  await supabase.from("product_listings").update({ status }).eq("id", listingId).eq("seller_id", viewer.id);
  revalidatePath(`/marketplace/${listingId}`);
  revalidatePath("/marketplace");
}

export async function deleteListing(listingId: string) {
  const viewer = await verifiedOrNull();
  if (!viewer || !uuid.safeParse(listingId).success) return;
  const supabase = await createClient();
  const { data: images } = await supabase.from("product_images").select("storage_path").eq("listing_id", listingId);
  const { error } = await supabase.from("product_listings").delete().eq("id", listingId).eq("seller_id", viewer.id);
  if (!error && images?.length) {
    await supabase.storage.from(PHOTO_BUCKET).remove(images.map((i) => i.storage_path));
  }
  revalidatePath("/marketplace");
  redirect("/marketplace?mine=1");
}

export async function toggleSaved(listingId: string, saved: boolean) {
  const viewer = await verifiedOrNull();
  if (!viewer || !uuid.safeParse(listingId).success) return;
  const supabase = await createClient();
  if (saved) {
    await supabase.from("saved_listings").delete().eq("user_id", viewer.id).eq("listing_id", listingId);
  } else {
    await supabase.from("saved_listings").upsert({ user_id: viewer.id, listing_id: listingId }, { ignoreDuplicates: true });
  }
  revalidatePath(`/marketplace/${listingId}`);
}

export async function contactSeller(listingId: string, sellerId: string) {
  const viewer = await verifiedOrNull();
  if (!viewer || !uuid.safeParse(listingId).success || !uuid.safeParse(sellerId).success) redirect("/marketplace");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_conversation", { p_peer: sellerId, p_listing: listingId });
  if (error || !data) {
    console.error("start_conversation failed", error);
    redirect(`/marketplace/${listingId}?error=chat`);
  }
  redirect(`/messages/${data}`);
}
