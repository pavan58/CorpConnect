"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { resendVerificationOtp, verifyCorporateOtp } from "@/features/auth/actions";
import { initialState, type ActionState } from "@/lib/action-state";
import { Alert } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const LENGTH = 6;
const RESEND_SECONDS = 60;

export function VerifyForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState(verifyCorporateOtp, initialState);
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const lastSubmitted = useRef("");
  const [resendState, setResendState] = useState<ActionState>({});
  const [resending, startResend] = useTransition();
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  const code = digits.join("");

  // Auto-submit as soon as all six digits are present.
  useEffect(() => {
    if (code.length === LENGTH && /^\d{6}$/.test(code) && code !== lastSubmitted.current && !pending) {
      lastSubmitted.current = code;
      formRef.current?.requestSubmit();
    }
  }, [code, pending]);

  // After a wrong code, clear the boxes so the user can retype.
  useEffect(() => {
    if (state.message) {
      setDigits(Array(LENGTH).fill(""));
      lastSubmitted.current = "";
      inputs.current[0]?.focus();
    }
  }, [state]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function setAt(i: number, v: string) {
    setDigits((d) => { const n = [...d]; n[i] = v; return n; });
  }

  function onChange(i: number, raw: string) {
    const only = raw.replace(/\D/g, "");
    if (only.length > 1) {
      // Paste or SMS/email autofill of the whole code
      const next = only.slice(0, LENGTH).split("");
      setDigits(Array.from({ length: LENGTH }, (_, k) => next[k] ?? ""));
      inputs.current[Math.min(next.length, LENGTH - 1)]?.focus();
      return;
    }
    setAt(i, only);
    if (only && i < LENGTH - 1) inputs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) { setAt(i - 1, ""); inputs.current[i - 1]?.focus(); }
    if (e.key === "ArrowLeft" && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < LENGTH - 1) inputs.current[i + 1]?.focus();
  }

  const error = state.message ?? (resendState.ok ? undefined : resendState.message) ?? initialError;

  return (
    <div className="space-y-5">
      {error ? <Alert tone="error">{error}</Alert> : null}
      {resendState.ok && resendState.message ? <Alert tone="success">{resendState.message}</Alert> : null}

      <form ref={formRef} action={action}>
        <input type="hidden" name="code" value={code} />
        <fieldset disabled={pending} className="flex justify-center gap-2" aria-label="6-digit verification code">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              value={d}
              onChange={(e) => onChange(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onFocus={(e) => e.target.select()}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              pattern="\d*"
              maxLength={i === 0 ? LENGTH : 1}
              autoFocus={i === 0}
              aria-label={`Digit ${i + 1}`}
              className={cn(
                "size-12 sm:size-14 rounded-md border border-input bg-card text-center text-xl font-semibold tabular-nums",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring",
              )}
            />
          ))}
        </fieldset>
        <div className="mt-5">
          <Button type="submit" className="w-full" disabled={pending || code.length !== LENGTH}>
            {pending ? <><Loader2 className="animate-spin" /> Verifying…</> : "Verify"}
          </Button>
        </div>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Didn&apos;t get it?{" "}
        <button
          type="button"
          className="font-medium text-primary disabled:text-muted-foreground cursor-pointer disabled:cursor-default"
          disabled={cooldown > 0 || resending}
          onClick={() => startResend(async () => {
            const r = await resendVerificationOtp();
            setResendState(r);
            if (r.ok) setCooldown(RESEND_SECONDS);
          })}
        >
          {resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </div>
    </div>
  );
}
