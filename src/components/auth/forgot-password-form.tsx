"use client";

import { useActionState } from "react";
import { requestPasswordReset, resetPassword } from "@/features/auth/actions";
import type { ActionState } from "@/lib/action-state";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/misc";

const init: ActionState<{ email: string }> = {};

export function ForgotPasswordForm() {
  const [req, requestAction] = useActionState(requestPasswordReset, init);
  const [res, resetAction] = useActionState(resetPassword, init);
  const email = res.data?.email ?? req.data?.email;

  if (!email) {
    return (
      <form action={requestAction} className="space-y-4" noValidate>
        {req.message ? <Alert tone="error">{req.message}</Alert> : null}
        <Field label="Work email" htmlFor="email" errors={req.fieldErrors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <SubmitButton className="w-full" pendingText="Sending…">Send reset code</SubmitButton>
      </form>
    );
  }

  const fe = res.fieldErrors ?? {};
  return (
    <form action={resetAction} className="space-y-4" noValidate>
      {res.message ? <Alert tone="error">{res.message}</Alert> : req.message ? <Alert tone={req.ok ? "success" : "error"}>{req.message}</Alert> : null}
      <input type="hidden" name="email" value={email} />
      <Field label="6-digit code" htmlFor="code" errors={fe.code}>
        <Input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required className="tracking-[0.5em] text-center text-lg" />
      </Field>
      <Field label="New password" htmlFor="password" errors={fe.password} hint="At least 10 characters with a letter and a number.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
      </Field>
      <SubmitButton className="w-full" pendingText="Updating…">Update password</SubmitButton>
    </form>
  );
}
