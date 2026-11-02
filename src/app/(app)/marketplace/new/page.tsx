import type { Metadata } from "next";
import { requireVerified } from "@/lib/auth/guards";
import { HUBS } from "@/lib/pune";
import { ListingForm } from "@/components/marketplace/listing-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Sell an item" };

export default async function NewListingPage() {
  const viewer = await requireVerified();
  const defaultZone = HUBS.find((h) => h.code === viewer.profile.work_location_pune)?.zone ?? "hinjawadi";
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Sell an item" description="Electronics only. Buyers are verified employees in Pune." />
      <Card><CardContent className="pt-5"><ListingForm userId={viewer.id} defaultZone={defaultZone} /></CardContent></Card>
      <p className="mt-4 text-xs text-muted-foreground">
        Tip: meet in a staffed, public spot such as a tech-park gate or lobby, check the item before paying, and use UPI rather than cash where you can.
      </p>
    </div>
  );
}
