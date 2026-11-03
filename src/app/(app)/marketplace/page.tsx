import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireVerified } from "@/lib/auth/guards";
import { signPhotos } from "@/lib/storage";
import { CATEGORIES, ZONES } from "@/lib/pune";
import { ListingCard, type ListingCardData } from "@/components/marketplace/listing-card";
import { buttonVariants } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Marketplace" };

type SP = { zone?: string; category?: string; q?: string; max?: string; saved?: string; mine?: string };

type Row = {
  id: string; title: string; price_inr: number; negotiable: boolean; condition: string; pickup_point: string;
  status: string; is_featured: boolean; created_at: string;
  seller: { full_name: string; company: { name: string } | null } | null;
  product_images: { storage_path: string; position: number }[];
};

export default async function MarketplacePage({ searchParams }: { searchParams: Promise<SP> }) {
  const viewer = await requireVerified();
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("product_listings")
    .select("id, title, price_inr, negotiable, condition, pickup_point, status, is_featured, created_at, seller:profiles!product_listings_seller_id_fkey(full_name, company:companies(name)), product_images(storage_path, position)")
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(60);

  if (sp.mine) query = query.eq("seller_id", viewer.id).neq("status", "removed");
  else query = query.in("status", ["active", "reserved"]);
  if (sp.zone && ZONES.some((z) => z.code === sp.zone)) query = query.eq("zone_code", sp.zone);
  if (sp.category && CATEGORIES.some((c) => c.code === sp.category)) query = query.eq("category", sp.category);
  const max = Number(sp.max);
  if (Number.isFinite(max) && max > 0) query = query.lte("price_inr", max);
  const q = sp.q?.replace(/[%_,()]/g, " ").trim();
  if (q) query = query.ilike("title", `%${q}%`);
  if (sp.saved) {
    const { data: saved } = await supabase.from("saved_listings").select("listing_id").eq("user_id", viewer.id);
    query = query.in("id", (saved ?? []).map((s) => s.listing_id).concat("00000000-0000-0000-0000-000000000000"));
  }

  const { data, error } = await query;
  const rows = (data ?? []) as unknown as Row[];
  const cover = (r: Row) => [...r.product_images].sort((a, b) => a.position - b.position)[0]?.storage_path;
  const urls = await signPhotos(supabase, rows.map(cover).filter((p): p is string => !!p));

  const listings: ListingCardData[] = rows.map((r) => ({
    ...r,
    sellerName: r.seller?.full_name ?? "Member",
    sellerCompany: r.seller?.company?.name ?? "",
    imageUrl: urls[cover(r) ?? ""],
  }));

  const tab = sp.mine ? "mine" : sp.saved ? "saved" : "all";
  const tabs = [
    { key: "all", href: "/marketplace", label: "All listings" },
    { key: "saved", href: "/marketplace?saved=1", label: "Saved" },
    { key: "mine", href: "/marketplace?mine=1", label: "My listings" },
  ];

  return (
    <>
      <PageHeader
        title="Pune Electronics Marketplace"
        description="Buy and sell with verified colleagues. Meet at a tech-park gate or lobby to hand over."
        actions={<Link href="/marketplace/new" className={buttonVariants()}><Plus /> Sell an item</Link>}
      />

      <div className="mb-4 flex gap-1 border-b text-sm">
        {tabs.map((t) => (
          <Link key={t.key} href={t.href} className={cn("-mb-px border-b-2 px-3 py-2", tab === t.key ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground")}>{t.label}</Link>
        ))}
      </div>

      {tab === "all" ? (
        <form className="mb-6 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]" role="search">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input name="q" defaultValue={sp.q} placeholder="Search laptops, phones, monitors…" className="pl-9" aria-label="Search" />
          </div>
          <Select name="zone" defaultValue={sp.zone ?? ""} aria-label="Pune zone">
            <option value="">All Pune zones</option>
            {ZONES.map((z) => <option key={z.code} value={z.code}>{z.name}</option>)}
          </Select>
          <Select name="category" defaultValue={sp.category ?? ""} aria-label="Category">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </Select>
          <Input name="max" type="number" min={0} defaultValue={sp.max} placeholder="Max ₹" className="sm:w-28" aria-label="Maximum price" />
          <button className={buttonVariants({ variant: "secondary" })}>Filter</button>
        </form>
      ) : null}

      {error ? <p className="text-sm text-destructive">Couldn&apos;t load listings. Refresh to try again.</p> : null}

      {listings.length ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {listings.map((l) => <ListingCard key={l.id} l={l} />)}
        </div>
      ) : (
        <EmptyState icon={<ShoppingBag />} title={tab === "mine" ? "You haven't listed anything yet" : tab === "saved" ? "No saved items" : "No listings match"}>
          {tab === "all" ? "Try another zone or category, or be the first to list something." : null}
        </EmptyState>
      )}
    </>
  );
}
