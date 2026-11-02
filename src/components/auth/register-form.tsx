"use client";

import { useActionState, useMemo, useState } from "react";
import { registerEmployee } from "@/features/auth/actions";
import { initialState } from "@/lib/action-state";
import { domainCandidates, emailDomain, isPublicEmailDomain } from "@/lib/email-domain";
import { HUBS, ZONES } from "@/lib/pune";
import { Field, Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/misc";

export type CompanyOption = { id: string; name: string; domains: string[] };

export function RegisterForm({ companies }: { companies: CompanyOption[] }) {
  const [state, action] = useActionState(registerEmployee, initialState);
  const [email, setEmail] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [touchedCompany, setTouchedCompany] = useState(false);

  const domainToCompany = useMemo(() => {
    const m = new Map<string, CompanyOption>();
    companies.forEach((c) => c.domains.forEach((d) => m.set(d, c)));
    return m;
  }, [companies]);

  const domain = emailDomain(email);
  const isPublic = domain ? isPublicEmailDomain(domain) : false;
  const detected = domain && !isPublic
    ? domainCandidates(domain).map((d) => domainToCompany.get(d)).find(Boolean)
    : undefined;
  const effectiveCompany = touchedCompany ? companyId : detected?.id ?? companyId;

  const fe = state.fieldErrors ?? {};
  let emailHint: string | undefined = "Your official company address, e.g. name@tcs.com";
  if (isPublic) emailHint = undefined;
  else if (detected) emailHint = `✓ Recognised as ${detected.name}`;
  else if (domain) emailHint = `We'll check @${domain} when you submit.`;

  return (
    <form action={action} className="space-y-4" noValidate>
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}

      <Field label="Full name" htmlFor="fullName" errors={fe.fullName}>
        <Input id="fullName" name="fullName" autoComplete="name" required maxLength={80} aria-invalid={!!fe.fullName} />
      </Field>

      <Field
        label="Corporate email"
        htmlFor="corporateEmail"
        hint={emailHint}
        errors={isPublic ? ["Personal email providers aren't accepted. Use your work address."] : fe.corporateEmail}
      >
        <Input
          id="corporateEmail" name="corporateEmail" type="email" inputMode="email" autoComplete="email" required
          value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={isPublic || !!fe.corporateEmail}
        />
      </Field>

      <Field label="Password" htmlFor="password" errors={fe.password} hint="At least 10 characters with a letter and a number.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={72} aria-invalid={!!fe.password} />
      </Field>

      <Field label="Company" htmlFor="companyId" errors={fe.companyId}>
        <Select
          id="companyId" name="companyId" required value={effectiveCompany}
          onChange={(e) => { setCompanyId(e.target.value); setTouchedCompany(true); }}
          aria-invalid={!!fe.companyId}
        >
          <option value="" disabled>Select your company</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>

      <Field label="Designation" htmlFor="designation" errors={fe.designation}>
        <Input id="designation" name="designation" placeholder="e.g. Senior Software Engineer" required maxLength={80} aria-invalid={!!fe.designation} />
      </Field>

      <Field label="Pune work hub" htmlFor="workLocation" errors={fe.workLocation}>
        <Select id="workLocation" name="workLocation" required defaultValue="" aria-invalid={!!fe.workLocation}>
          <option value="" disabled>Where do you work?</option>
          {ZONES.map((z) => (
            <optgroup key={z.code} label={z.name}>
              {HUBS.filter((h) => h.zone === z.code).map((h) => <option key={h.code} value={h.code}>{h.name}</option>)}
            </optgroup>
          ))}
        </Select>
      </Field>

      <div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="acceptTerms" className="mt-0.5 size-4 accent-[var(--color-primary)]" required />
          <span className="text-muted-foreground">
            I agree to the <a href="/terms" className="text-primary" target="_blank">Terms</a> and{" "}
            <a href="/privacy" className="text-primary" target="_blank">Privacy Policy</a>, and confirm I currently work at the company above.
          </span>
        </label>
        {fe.acceptTerms ? <p className="text-xs text-destructive mt-1">{fe.acceptTerms[0]}</p> : null}
      </div>

      <SubmitButton className="w-full" disabled={isPublic} pendingText="Sending code…">Send verification code</SubmitButton>
    </form>
  );
}
