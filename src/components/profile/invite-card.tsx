"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InviteCard({ url, invitedVerified, invitedTotal }: { url: string; invitedVerified: number; invitedTotal: number }) {
  const [copied, setCopied] = useState(false);
  const text = "Join me on CorpConnect, the private network for verified tech employees in Pune: buy/sell gear safely and get internal referrals.";

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  }
  async function share() {
    if (navigator.share) { try { await navigator.share({ title: "CorpConnect Pune", text, url }); } catch { /* cancelled */ } }
    else void copy();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Share your personal link in your team chat. Colleagues who join with it are counted below.
      </p>
      <div className="flex gap-2">
        <input readOnly value={url} aria-label="Your invite link" onFocus={(e) => e.target.select()}
          className="h-10 min-w-0 flex-1 rounded-md border border-input bg-muted px-3 font-mono text-xs" />
        <Button type="button" variant="secondary" onClick={copy} aria-label="Copy invite link">
          {copied ? <Check className="text-success" /> : <Copy />}{copied ? "Copied" : "Copy"}
        </Button>
        <Button type="button" onClick={share} className="hidden sm:inline-flex" aria-label="Share invite link"><Share2 /> Share</Button>
      </div>
      <p className="text-sm"><span className="font-semibold">{invitedVerified}</span> verified colleague{invitedVerified === 1 ? "" : "s"} joined
        {invitedTotal > invitedVerified ? <span className="text-muted-foreground"> · {invitedTotal - invitedVerified} pending</span> : null}</p>
    </div>
  );
}
