import Link from "next/link";
import { ImageOff, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { conditionName, pickupName } from "@/lib/pune";
import { formatInr, timeAgo } from "@/lib/utils";

export type ListingCardData = {
  id: string;
  title: string;
  price_inr: number;
  negotiable: boolean;
  condition: string;
  pickup_point: string;
  status: string;
  is_featured?: boolean;
  created_at: string;
  sellerName: string;
  sellerCompany: string;
  imageUrl?: string;
};

export function ListingCard({ l }: { l: ListingCardData }) {
  return (
    <Link href={`/marketplace/${l.id}`} className="group overflow-hidden rounded-lg border bg-card shadow-sm transition hover:shadow-md">
      <div className="relative aspect-[4/3] bg-muted">
        {l.imageUrl ? (
          <img src={l.imageUrl} alt="" loading="lazy" className="size-full object-cover transition group-hover:scale-[1.02]" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground"><ImageOff className="size-6" /></div>
        )}
        {l.is_featured && l.status === "active" ? <Badge className="absolute left-2 top-2 bg-primary text-primary-foreground">Featured</Badge> : null}
        {l.status !== "active" ? (
          <Badge variant={l.status === "sold" ? "destructive" : "warning"} className="absolute left-2 top-2 capitalize">{l.status}</Badge>
        ) : null}
      </div>
      <div className="space-y-1 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-lg font-semibold">{formatInr(l.price_inr)}</span>
          <span className="text-xs text-muted-foreground">{conditionName(l.condition)}</span>
        </div>
        <p className="line-clamp-1 text-sm font-medium">{l.title}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3 shrink-0" /><span className="line-clamp-1">{pickupName(l.pickup_point)}</span></p>
        <p className="text-xs text-muted-foreground line-clamp-1">{l.sellerName} · {l.sellerCompany} · {timeAgo(l.created_at)}</p>
      </div>
    </Link>
  );
}
