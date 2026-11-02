import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, ExternalLink, MapPin } from "lucide-react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireVerified } from "@/lib/auth/guards";
import { hubName } from "@/lib/pune";
import { EMPLOYMENT_TYPES, REFERRAL_STATUS, WORK_MODES } from "@/features/jobs/schema";
import { setJobStatus } from "@/features/jobs/actions";
import { ReferralForm } from "@/components/jobs/referral-form";
import { ReportButton } from "@/components/common/report-button";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Job" };

type Job = {
  id: string; posted_by: string; title: string; description: string; employment_type: string; work_mode: string;
  experience_min: number; experience_max: number; hub_code: string; apply_url: string | null; status: string; created_at: string;
  company: { name: string } | null;
  poster: { full_name: string; designation: string } | null;
};

const label = (list: readonly { code: string; name: string }[], c: string) => list.find((x) => x.code === c)?.name ?? c;

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireVerified();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const supabase = await createClient();

  const [{ data }, { data: mine }, { count }] = await Promise.all([
    supabase.from("job_listings")
      .select("id, posted_by, title, description, employment_type, work_mode, experience_min, experience_max, hub_code, apply_url, status, created_at, company:companies(name), poster:profiles(full_name, designation)")
      .eq("id", id).maybeSingle(),
    supabase.from("referral_requests").select("status").eq("job_id", id).eq("requester_id", viewer.id).maybeSingle(),
    supabase.from("referral_requests").select("id", { count: "exact", head: true }).eq("job_id", id).eq("referrer_id", viewer.id),
  ]);
  const job = data as unknown as Job | null;
  if (!job) notFound();
  const isPoster = job.posted_by === viewer.id;

  return (
    <div className="space-y-4">
      <Link href="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Jobs</Link>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">{job.company?.name}</p>
            <h1 className="text-2xl font-semibold tracking-tight">{job.title}</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary"><MapPin />{hubName(job.hub_code)}, Pune</Badge>
              <Badge variant="secondary">{label(WORK_MODES, job.work_mode)}</Badge>
              <Badge variant="secondary">{label(EMPLOYMENT_TYPES, job.employment_type)}</Badge>
              <Badge variant="secondary">{job.experience_min}–{job.experience_max} yrs</Badge>
              {job.status === "closed" ? <Badge variant="destructive">Closed</Badge> : null}
            </div>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed">{job.description}</p>
          {job.apply_url ? (
            <a href={job.apply_url} target="_blank" rel="noopener noreferrer nofollow" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Careers page <ExternalLink />
            </a>
          ) : null}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Posted {timeAgo(job.created_at)}</span>
            {!isPoster ? <ReportButton targetType="job" targetId={job.id} /> : null}
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5 flex items-center gap-3">
              <Avatar name={job.poster?.full_name ?? "?"} />
              <div className="text-sm">
                <p className="font-medium flex items-center gap-1">{job.poster?.full_name} <BadgeCheck className="size-4 text-success" /></p>
                <p className="text-muted-foreground">{job.poster?.designation} at {job.company?.name}</p>
              </div>
            </CardContent>
          </Card>

          {isPoster ? (
            <Card>
              <CardHeader><CardTitle>Your opening</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>{count ?? 0} referral request{count === 1 ? "" : "s"}.</p>
                <div className="flex gap-2">
                  <Link href="/jobs/referrals?tab=received" className={buttonVariants({ size: "sm" })}>Review requests</Link>
                  <form action={setJobStatus.bind(null, job.id, job.status === "open" ? "closed" : "open")}>
                    <Button size="sm" variant="outline">{job.status === "open" ? "Close opening" : "Reopen"}</Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ) : mine ? (
            <Card><CardContent className="pt-5 text-sm">
              Your request: <Badge variant={REFERRAL_STATUS[mine.status as keyof typeof REFERRAL_STATUS].tone}>{REFERRAL_STATUS[mine.status as keyof typeof REFERRAL_STATUS].label}</Badge>
              <p className="mt-2"><Link href="/jobs/referrals" className="text-primary">Track in My referrals →</Link></p>
            </CardContent></Card>
          ) : job.status === "open" ? (
            <Card>
              <CardHeader><CardTitle>Ask {job.poster?.full_name?.split(" ")[0]} for a referral</CardTitle></CardHeader>
              <CardContent><ReferralForm jobId={job.id} /></CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
