"use client";

import { useActionState } from "react";
import { createJob } from "@/features/jobs/actions";
import { EMPLOYMENT_TYPES, WORK_MODES } from "@/features/jobs/schema";
import { initialState } from "@/lib/action-state";
import { HUBS, ZONES } from "@/lib/pune";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/misc";

export function JobForm({ companyName, defaultHub }: { companyName: string; defaultHub: string }) {
  const [state, action] = useActionState(createJob, initialState);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <Field label="Company" htmlFor="company" hint="You can only post openings at the company your email verified.">
        <Input id="company" value={companyName} disabled readOnly />
      </Field>
      <Field label="Job title" htmlFor="title" errors={fe.title}>
        <Input id="title" name="title" placeholder="e.g. Senior Data Engineer" maxLength={120} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" htmlFor="employmentType" errors={fe.employmentType}>
          <Select id="employmentType" name="employmentType" defaultValue="full_time">
            {EMPLOYMENT_TYPES.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
          </Select>
        </Field>
        <Field label="Work mode" htmlFor="workMode" errors={fe.workMode}>
          <Select id="workMode" name="workMode" defaultValue="hybrid">
            {WORK_MODES.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
          </Select>
        </Field>
        <Field label="Experience from (years)" htmlFor="experienceMin" errors={fe.experienceMin}>
          <Input id="experienceMin" name="experienceMin" type="number" min={0} max={40} defaultValue={2} />
        </Field>
        <Field label="Experience to (years)" htmlFor="experienceMax" errors={fe.experienceMax}>
          <Input id="experienceMax" name="experienceMax" type="number" min={0} max={40} defaultValue={5} />
        </Field>
      </div>
      <Field label="Pune office" htmlFor="hubCode" errors={fe.hubCode}>
        <Select id="hubCode" name="hubCode" defaultValue={defaultHub}>
          {ZONES.map((z) => (
            <optgroup key={z.code} label={z.name}>
              {HUBS.filter((h) => h.zone === z.code).map((h) => <option key={h.code} value={h.code}>{h.name}</option>)}
            </optgroup>
          ))}
        </Select>
      </Field>
      <Field label="Description" htmlFor="description" errors={fe.description}>
        <Textarea id="description" name="description" rows={8} maxLength={5000} placeholder="Team, stack, responsibilities, must-haves, interview process…" required />
      </Field>
      <Field label="Careers page link (optional)" htmlFor="applyUrl" errors={fe.applyUrl}>
        <Input id="applyUrl" name="applyUrl" type="url" placeholder="https://careers.example.com/job/123" />
      </Field>
      <SubmitButton pendingText="Posting…">Post opening</SubmitButton>
    </form>
  );
}
