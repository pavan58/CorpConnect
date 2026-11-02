"use client";

import { useActionState } from "react";
import { updateProfile } from "@/features/profile/actions";
import { initialState } from "@/lib/action-state";
import { HUBS, ZONES } from "@/lib/pune";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/misc";

export function ProfileForm({ profile }: { profile: { full_name: string; designation: string; work_location_pune: string; bio: string | null } }) {
  const [state, action] = useActionState(updateProfile, initialState);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      {state.message ? <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert> : null}
      <Field label="Full name" htmlFor="fullName" errors={fe.fullName}>
        <Input id="fullName" name="fullName" defaultValue={profile.full_name} maxLength={80} required />
      </Field>
      <Field label="Designation" htmlFor="designation" errors={fe.designation}>
        <Input id="designation" name="designation" defaultValue={profile.designation} maxLength={80} required />
      </Field>
      <Field label="Pune work hub" htmlFor="workLocation" errors={fe.workLocation}>
        <Select id="workLocation" name="workLocation" defaultValue={profile.work_location_pune}>
          {ZONES.map((z) => (
            <optgroup key={z.code} label={z.name}>
              {HUBS.filter((h) => h.zone === z.code).map((h) => <option key={h.code} value={h.code}>{h.name}</option>)}
            </optgroup>
          ))}
        </Select>
      </Field>
      <Field label="About (optional)" htmlFor="bio" errors={fe.bio}>
        <Textarea id="bio" name="bio" defaultValue={profile.bio ?? ""} maxLength={500} rows={3} placeholder="Stack, interests, what you can help with…" />
      </Field>
      <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
    </form>
  );
}
