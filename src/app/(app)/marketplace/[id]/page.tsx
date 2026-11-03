import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, Bookmark, BookmarkCheck, MapPin, MessageCircle, ShieldCheck, Trash2 } from "lucide-react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireVerified } from "@/lib/auth/guards";
import { signPhotos } from "@/lib/storage";
import { categoryName, conditionName, hubName, pickupName, zoneName } from "@/lib/pune";
import { formatInr, timeAgo } from "@/lib/utils";
import { contactSeller, deleteListing, setListingStatus, toggleSaved } from "@/features/marketplace/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, Avatar } from "@/components/ui/misc";
import { ReportButton } from "@/components/common/report-button";
import { PhotoGallery } from "@/components/marketplace/photo-gallery";
import { MemberBadges } from "@/components/common/member-badges";
import { setListingFeatured } from "@/features/admin/actions";

export const metadata: Metadata = { title: "Listing" };

type Listing = {
  id: string; seller_id: string; title: string; description: string; category: string; condition: string;
  price_inr: number; negotiable: boolean; zone_code: string; pickup_point: string; status: string; is_featured: boolean; created_at: string;
  seller: { id: string; full_name: string; designation: string; work_location_pune: string; is_ambassador: boolean; member_number: number | null; company: { name: string } | null } | null;
  product_images: { storage_path: string; position: number }[];
};

export default async function ListingPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const viewer = await requireVerified();
  const { id } = await params;
  const { error: err } = await searchParams;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const [{ data }, { data: saved }] = await Promise.all([
    supabase
      .from("product_listings")
      .select("id, seller_id, title, description, category, condition, price_inr, negotiable, zone_code, pickup_point, status, is_featured, created_at, seller:profiles!product_listings_seller_id_fkey(id, full_name, designation, work_location_pune, is_ambassador, member_number, company:companies(name)), product_images(storage_path, position)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("saved_listings").select("listing_id").eq("user_id", viewer.id).eq("listing_id", id).maybeSingle(),
  ]);
  const l = data as unknown as Listing | null;
  if (!l) notFound();

  const images = [...l.product_images].sort((a, b) => a.position - b.position);
  const urls = await signPhotos(supabase, images.map((i) => i.storage_path));
  const isMine = l.seller_id === viewer.id;
  const isSaved = !!saved;

  return (
    <div className="space-y-4">
      <Link href="/marketplace" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Marketplace</Link>
      {err === "chat" ? <Alert tone="error">Couldn&apos;t start a chat with this seller. Try again.</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <PhotoGallery urls={images.map((i) => urls[i.storage_path]).filter((u): u is string => !!u)} title={l.title} />

        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{categoryName(l.category)}</Badge>
              <Badge variant="secondary">{conditionName(l.condition)}</Badge>
              {l.status !== "active" ? <Badge variant={l.status === "sold" ? "destructive" : "warning"} className="capitalize">{l.status}</Badge> : null}
              {l.is_featured ? <Badge>Featured</Badge> : null}
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">{l.title}</h1>
            <p className="mt-2 text-3xl font-semibold">{formatInr(l.price_inr)} {l.negotiable ? <span className="text-sm font-normal text-muted-foreground">negotiable</span> : null}</p>
            <p className="mt-1 text-xs text-muted-foreground">Listed {timeAgo(l.created_at)}</p>
          </div>

          <Card>
            <CardContent className="pt-5 space-y-2 text-sm">
              <p className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 text-primary shrink-0" /><span><span className="font-medium">{pickupName(l.pickup_point)}</span><br /><span className="text-muted-foreground">{zoneName(l.zone_code)}, Pune</span></span></p>
              <p className="flex items-start gap-2 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 text-success shrink-0" />Meet at the handover spot during office hours. Inspect before you pay.</p>
            </CardContent>
          </Card>

          {l.seller ? (
            <div className="flex items-center gap-3">
              <Avatar name={l.seller.full_name} />
              <div className="text-sm">
                <p className="font-medium flex items-center gap-1">{l.seller.full_name} <BadgeCheck className="size-4 text-success" aria-label="Verified employee" /> <MemberBadges isAmbassador={l.seller.is_ambassador} memberNumber={l.seller.member_number} /></p>
                <p className="text-muted-foreground">{l.seller.designation} · {l.seller.company?.name} · {hubName(l.seller.work_location_pune)}</p>
              </div>
            </div>
          ) : null}

          {isMine ? (
            <div className="flex flex-wrap gap-2">
              {(["active", "reserved", "sold"] as const).filter((s) => s !== l.status).map((s) => (
                <form key={s} action={setListingStatus.bind(null, l.id, s)}>
                  <Button variant="outline" size="sm">Mark {s === "active" ? "available" : s}</Button>
                </form>
              ))}
              <form action={deleteListing.bind(null, l.id)}>
                <Button variant="ghost" size="sm" className="text-destructive"><Trash2 /> Delete</Button>
              </form>
            </div>
          ) : (
            <div className="flex gap-2">
              {l.status !== "sold" ? (
                <form action={contactSeller.bind(null, l.id, l.seller_id)} className="flex-1">
                  <Button className="w-full"><MessageCircle /> Chat with seller</Button>
                </form>
              ) : null}
              <form action={toggleSaved.bind(null, l.id, isSaved)}>
                <Button variant="outline" aria-label={isSaved ? "Unsave" : "Save"}>{isSaved ? <BookmarkCheck className="text-primary" /> : <Bookmark />}{isSaved ? "Saved" : "Save"}</Button>
              </form>
            </div>
          )}

          <div>
            <h2 className="text-sm font-semibold">Description</h2>
            <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{l.description}</p>
          </div>

          <div className="flex items-center justify-between gap-2">
            {viewer.profile.role !== "member" ? (
              <form action={setListingFeatured.bind(null, l.id, !l.is_featured)}>
                <Button variant="outline" size="sm">{l.is_featured ? "Unfeature" : "Feature this listing"}</Button>
              </form>
            ) : <span />}
            {!isMine ? <ReportButton targetType="listing" targetId={l.id} label="Report listing" /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
