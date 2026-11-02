"use client";

import { useActionState } from "react";
import { Flag } from "lucide-react";
import { reportContent } from "@/features/reports/actions";
import { initialState } from "@/lib/action-state";
import { Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/misc";

const REASONS = [
  ["scam", "Scam or fraud"], ["spam", "Spam"], ["prohibited_item", "Prohibited item"],
  ["offensive", "Offensive"], ["fake_profile", "Fake profile"], ["other", "Other"],
] as const;

export function ReportButton({ targetType, targetId, label = "Report" }: {
  targetType: "listing" | "job" | "post" | "comment" | "user" | "message"; targetId: string; label?: string;
}) {
  const [state, action] = useActionState(reportContent, initialState);
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
        <Flag className="size-3.5" /> {label}
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-72 rounded-lg border bg-card p-3 shadow-lg">
        {state.ok ? (
          <Alert tone="success">{state.message}</Alert>
        ) : (
          <form action={action} className="space-y-2">
            {state.message ? <Alert tone="error">{state.message}</Alert> : null}
            <input type="hidden" name="targetType" value={targetType} />
            <input type="hidden" name="targetId" value={targetId} />
            <Select name="reason" defaultValue="" required aria-label="Reason">
              <option value="" disabled>Why are you reporting this?</option>
              {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <Textarea name="details" rows={2} maxLength={1000} placeholder="Details (optional)" className="min-h-0" />
            <SubmitButton size="sm" variant="destructive" className="w-full">Send report</SubmitButton>
          </form>
        )}
      </div>
    </details>
  );
}
