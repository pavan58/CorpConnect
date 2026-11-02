import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Inbox, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireVerified } from "@/lib/auth/guards";
import { REFERRAL_STATUS } from "@/features/jobs/schema";
import { decideReferral, withdrawReferral } from "@/features/jobs/actions";
import { startChatWith } from "@/features/messaging/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { cn, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "My referrals" };

type Req = {
  id: string; status: keyof typeof REFERRAL_STATUS; message: string; resume_url: string | null; referrer_note: string | null;
  created_at: string; updated_at: string; requester_id: string; referrer_id: string;
  job: { id: string; title: string; company: { name: string } | null } | null;
  requester: { full_name: string; designation: string; company: { name: string } | null } | null;
  referrer: { full_name: string } | null;
};

const COLS = "id, status, message, resume_url, referrer_note, created_at, updated_at, requester_id, referrer_id, job:job_listings(id, title, company:companies(name)), requester:profiles!referral_requests_requester_id_fkey(full_name, designation, company:companies(name)), referrer:profiles!referral_requests_referrer_id_fkey(full_name)";

function StatusBadge({ s }: { s: keyof typeof REFERRAL_STATUS }) {
  return <Badge variant={REFERRAL_STATUS[s].tone}>{REFERRAL_STATUS[s].label}</Badge>;
}

export default async function ReferralsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const viewer = await requireVerified();
  const tab = (await searchParams).tab === "received" ? "received" : "sent";
  const supabase = await createClient();
  const { data } = await supabase
    .from("referral_requests").select(COLS)
    .eq(tab === "sent" ? "requester_id" : "referrer_id", viewer.id)
    .order("updated_at", { ascending: false });
  const rows = (data ?? []) as unknown as Req[];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="My referrals" description="Track every request from requested → in review → referred." />
      <div className="mb-4 flex gap-1 border-b text-sm">
        {[["sent", "Requests I sent"], ["received", "Requests to me"]].map(([k, l]) => (
          <Link key={k} href={`/jobs/referrals?tab=${k}`} className={cn("-mb-px border-b-2 px-3 py-2", tab === k ? "border-primary font-medium" : "border-transparent text-muted-foreground")}>{l}</Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={tab === "sent" ? <Send /> : <Inbox />} title={tab === "sent" ? "You haven't requested any referrals" : "No requests yet"}>
          {tab === "sent" ? <Link href="/jobs" className="text-primary">Browse openings</Link> : "Post an opening and colleagues can ask you for a referral."}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/jobs/${r.job?.id}`} className="font-medium hover:underline">{r.job?.title}</Link>
                  <p className="text-sm text-muted-foreground">
                    {r.job?.company?.name} · {tab === "sent" ? `Referrer: ${r.referrer?.full_name}` : `${r.requester?.full_name}, ${r.requester?.designation} at ${r.requester?.company?.name}`}
                  </p>
                </div>
                <StatusBadge s={r.status} />
              </div>
              <p className="mt-3 whitespace-pre-line text-sm">{r.message}</p>
              {r.resume_url ? <a href={r.resume_url} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 inline-flex items-center gap-1 text-sm text-primary">Resume <ExternalLink className="size-3.5" /></a> : null}
              {r.referrer_note ? <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm"><span className="font-medium">Note from referrer:</span> {r.referrer_note}</p> : null}
              <p className="mt-2 text-xs text-muted-foreground">Updated {timeAgo(r.updated_at)}</p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {tab === "received" && r.status !== "withdrawn" && r.status !== "referred" && r.status !== "declined" ? (
                  <form action={decideReferral} className="flex w-full flex-wrap gap-2">
                    <input type="hidden" name="requestId" value={r.id} />
                    <Input name="note" placeholder="Note for the requester (optional)" maxLength={500} className="h-8 flex-1 min-w-48 text-xs" />
                    {r.status === "requested" ? <Button size="sm" variant="outline" name="status" value="in_review">In review</Button> : null}
                    <Button size="sm" name="status" value="referred">Mark referred</Button>
                    <Button size="sm" variant="ghost" className="text-destructive" name="status" value="declined">Decline</Button>
                  </form>
                ) : null}
                {tab === "sent" && (r.status === "requested" || r.status === "in_review") ? (
                  <form action={withdrawReferral.bind(null, r.id)}><Button size="sm" variant="ghost">Withdraw</Button></form>
                ) : null}
                <form action={startChatWith.bind(null, tab === "sent" ? r.referrer_id : r.requester_id)}>
                  <Button size="sm" variant="outline">Message</Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
