import type { Metadata } from "next";
import { requireVerified } from "@/lib/auth/guards";
import { JobForm } from "@/components/jobs/job-form";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Post a job" };

export default async function NewJobPage() {
  const viewer = await requireVerified();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Post an opening" description="Colleagues across Pune can request a referral from you. You decide who to refer." />
      <Card><CardContent className="pt-5">
        <JobForm companyName={viewer.profile.company?.name ?? ""} defaultHub={viewer.profile.work_location_pune} />
      </CardContent></Card>
    </div>
  );
}
