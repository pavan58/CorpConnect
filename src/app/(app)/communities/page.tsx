import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, MapPin, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireVerified } from "@/lib/auth/guards";
import { zoneName } from "@/lib/pune";
import { joinCommunity } from "@/features/communities/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Communities" };

export default async function CommunitiesPage() {
  const viewer = await requireVerified();
  const supabase = await createClient();
  const [{ data: communities }, { data: members }] = await Promise.all([
    supabase.from("communities").select("id, slug, name, description, zone_code, is_official").order("is_official", { ascending: false }).order("name"),
    supabase.from("community_members").select("community_id, user_id"),
  ]);
  const counts = new Map<string, number>();
  const joined = new Set<string>();
  for (const m of members ?? []) {
    counts.set(m.community_id, (counts.get(m.community_id) ?? 0) + 1);
    if (m.user_id === viewer.id) joined.add(m.community_id);
  }

  return (
    <>
      <PageHeader title="Pune tech communities" description="Local spaces for people who work in the same corridors as you." />
      <div className="grid gap-4 sm:grid-cols-2">
        {(communities ?? []).map((c) => (
          <div key={c.id} className="flex flex-col rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/communities/${c.slug}`} className="font-semibold hover:underline">{c.name}</Link>
              {c.is_official ? <Badge><BadgeCheck /> Official</Badge> : null}
            </div>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{c.description}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1"><Users className="size-3.5" />{counts.get(c.id) ?? 0}</span>
                <span className="flex items-center gap-1"><MapPin className="size-3.5" />{c.zone_code ? zoneName(c.zone_code) : "All Pune"}</span>
              </span>
              {joined.has(c.id) ? (
                <Link href={`/communities/${c.slug}`} className="text-primary font-medium text-sm">Open →</Link>
              ) : (
                <form action={joinCommunity.bind(null, c.id, c.slug)}><Button size="sm">Join</Button></form>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
