import type { Metadata } from "next";
import { BadgeCheck, Briefcase, ListChecks } from "lucide-react";
import { CampaignPage } from "@/components/marketing/campaign-page";

export const metadata: Metadata = {
  title: "Internal referrals from verified Pune employees",
  description: "Request internal referrals directly from verified employees at Pune's top MNC and product companies.",
};

export default function ReferralsCampaign() {
  return (
    <CampaignPage
      eyebrow="CorpConnect Referrals · Pune"
      title="Skip the job-portal black hole. Ask a verified insider."
      subtitle="Employees at Pune's MNC and product companies post openings from their own teams. Request a referral directly and track it from requested to referred."
      cta="Find a referral"
      footnote="Free. Your referral requests are visible only to you and the person you ask."
      points={[
        { icon: BadgeCheck, title: "Real employees only", body: "Every referrer verified their work email at the company they post jobs for." },
        { icon: Briefcase, title: "Hinjawadi to Kharadi", body: "Openings across Hinjawadi, EON Kharadi, Magarpatta, Baner, Yerwada and PCMC." },
        { icon: ListChecks, title: "No more ghosting", body: "Every request has a visible status: requested, in review, referred or declined." },
      ]}
    />
  );
}
