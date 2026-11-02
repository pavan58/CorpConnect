import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, MapPin, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireVerified } from "@/lib/auth/guards";
import { HUBS, ZONES, hubName } from "@/lib/pune";
import { EMPLOYMENT_TYPES, WORK_MODES } from "@/features/jobs/schema";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Jobs & referrals" };

type Row = {
  id: string; title: string; employment_type: string; work_mode: string; experience_min: number; experience_max: number;
  hub_code: string; created_at: string; company: { name: string } | null; poster: { full_name: string } | null;
};

const name = (list: readonly { code: string; name: string }[], c: string) => list.find((x) => x.code === c)?.name ?? c;

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ zone?: string; company?: string; mode?: string }> }) {
  await requireVerified();
  const sp = await searchParams;
  const supabase = await createClient();

  let q = supabase
    .from("job_listings")
    .select("id, title, employment_type, work_mode, experience_min, experience_max, hub_code, created_at, company:companies(name), poster:profiles(full_name)")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(60);
  if (sp.zone && ZONES.some((z) => z.code === sp.zone)) q = q.in("hub_code", HUBS.filter((h) => h.zone === sp.zone).map((h) => h.code));
  if (sp.mode && WORK_MODES.some((m) => m.code === sp.mode)) q = q.eq("work_mode", sp.mode);
  if (sp.company && /^[0-9a-f-]{36}$/.test(sp.company)) q = q.eq("company_id", sp.company);

  const [{ data }, { data: companies }] = await Promise.all([
    q,
    supabase.from("companies").select("id, name").order("name"),
  ]);
  const jobs = (data ?? []) as unknown as Row[];

  return (
    <>
      <PageHeader
        title="Jobs & referrals in Pune"
        description="Openings posted by verified employees. Request a referral straight from the person who works there."
        actions={<>
          <Link href="/jobs/referrals" className={buttonVariants({ variant: "outline" })}>My referrals</Link>
          <Link href="/jobs/new" className={buttonVariants()}><Plus /> Post a job</Link>
        </>}
      />
      <form className="mb-6 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <Select name="zone" defaultValue={sp.zone ?? ""} aria-label="Zone">
          <option value="">All Pune zones</option>
          {ZONES.map((z) => <option key={z.code} value={z.code}>{z.name}</option>)}
        </Select>
        <Select name="company" defaultValue={sp.company ?? ""} aria-label="Company">
          <option value="">All companies</option>
          {(companies ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select name="mode" defaultValue={sp.mode ?? ""} aria-label="Work mode">
          <option value="">Any work mode</option>
          {WORK_MODES.map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}
        </Select>
        <button className={buttonVariants({ variant: "secondary" })}>Filter</button>
      </form>

      {jobs.length ? (
        <ul className="grid gap-3">
          {jobs.map((j) => (
            <li key={j.id}>
              <Link href={`/jobs/${j.id}`} className="block rounded-lg border bg-card p-4 shadow-sm transition hover:shadow-md">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">{j.title}</p>
                    <p className="text-sm text-muted-foreground">{j.company?.name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{timeAgo(j.created_at)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary"><MapPin />{hubName(j.hub_code)}</Badge>
                  <Badge variant="secondary">{name(WORK_MODES, j.work_mode)}</Badge>
                  <Badge variant="secondary">{name(EMPLOYMENT_TYPES, j.employment_type)}</Badge>
                  <Badge variant="secondary">{j.experience_min}–{j.experience_max} yrs</Badge>
                  <Badge>Referral by {j.poster?.full_name}</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={<Briefcase />} title="No openings match">Post one for your team, or widen the filters.</EmptyState>
      )}
    </>
  );
}
