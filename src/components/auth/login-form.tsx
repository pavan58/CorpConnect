"use client";

import { useActionState } from "react";
import { signIn } from "@/features/auth/actions";
import { initialState } from "@/lib/action-state";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/misc";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, initialState);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Work email" htmlFor="email" errors={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password" errors={fe.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton className="w-full" pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
