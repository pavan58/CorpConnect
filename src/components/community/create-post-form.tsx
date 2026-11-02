"use client";

import { useActionState, useEffect, useRef } from "react";
import { createPost } from "@/features/communities/actions";
import { initialState } from "@/lib/action-state";
import { Textarea, FieldError } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/misc";

export function CreatePostForm({ communityId, slug, communityName }: { communityId: string; slug: string; communityName: string }) {
  const [state, action] = useActionState(createPost, initialState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2 rounded-lg border bg-card p-3 shadow-sm">
      {state.message ? <Alert tone="error">{state.message}</Alert> : null}
      <input type="hidden" name="communityId" value={communityId} />
      <input type="hidden" name="slug" value={slug} />
      <Textarea name="body" rows={3} maxLength={3000} placeholder={`Share with ${communityName}…`} aria-label="New post" className="border-0 shadow-none focus-visible:ring-0 px-1" required />
      <FieldError errors={state.fieldErrors?.body} />
      <div className="flex justify-end"><SubmitButton size="sm" pendingText="Posting…">Post</SubmitButton></div>
    </form>
  );
}
