"use client";

import { useActionState } from "react";
import { requestReferral } from "@/features/jobs/actions";
import { initialState } from "@/lib/action-state";
import { Field, Input, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/misc";

export function ReferralForm({ jobId }: { jobId: string }) {
  const [state, action] = useActionState(requestReferral, initialState);
  if (state.ok) return <Alert tone="success">{state.message}</Alert>;
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-3" noValidate>
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <input type="hidden" name="jobId" value={jobId} />
      <Field label="Why you're a fit" htmlFor="message" errors={fe.message}>
        <Textarea id="message" name="message" rows={5} maxLength={1500} placeholder="Current role, years of experience, key skills, notice period…" required />
      </Field>
      <Field label="Resume link (optional)" htmlFor="resumeUrl" errors={fe.resumeUrl} hint="A shareable https:// link (Drive, OneDrive, LinkedIn). We don't store files.">
        <Input id="resumeUrl" name="resumeUrl" type="url" placeholder="https://…" />
      </Field>
      <SubmitButton className="w-full" pendingText="Sending…">Request referral</SubmitButton>
    </form>
  );
}
