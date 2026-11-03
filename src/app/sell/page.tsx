import type { Metadata } from "next";
import { BadgeCheck, MapPin, ShieldCheck } from "lucide-react";
import { CampaignPage } from "@/components/marketing/campaign-page";

export const metadata: Metadata = {
  title: "Sell your tech to verified colleagues",
  description: "Sell your phone, laptop or monitor to verified tech employees in Pune. Hand over at your campus gate.",
};

export default function SellCampaign() {
  return (
    <CampaignPage
      eyebrow="CorpConnect Marketplace · Pune"
      title="Sell your tech to verified peers, right at your campus gate."
      subtitle="No scam callers, no advance-payment tricks, no strangers at your doorstep. Every buyer has verified their work email at a Pune tech company."
      cta="List an item in 2 minutes"
      footnote="Free. Verify with your work email — no ID cards or documents."
      points={[
        { icon: BadgeCheck, title: "Every buyer is verified", body: "Only people who confirmed a 6-digit code sent to their corporate inbox can message you." },
        { icon: MapPin, title: "Hand over at a gate you know", body: "Pick a familiar spot: Hinjawadi Phase 1 Circle, EON Gate 1, Magarpatta Tower 7, Commerzone and more." },
        { icon: ShieldCheck, title: "Your number stays private", body: "Chat inside CorpConnect. Share your phone number only if and when you want to." },
      ]}
    />
  );
}
