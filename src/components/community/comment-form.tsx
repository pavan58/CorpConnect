"use client";

import { useActionState, useEffect, useRef } from "react";
import { addComment } from "@/features/communities/actions";
import { initialState } from "@/lib/action-state";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

export function CommentForm({ postId, slug }: { postId: string; slug: string }) {
  const [state, action] = useActionState(addComment, initialState);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="flex gap-2">
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="slug" value={slug} />
      <Input name="body" maxLength={1000} placeholder={state.message ?? "Write a comment…"} aria-label="Comment" className="h-8 text-sm" required />
      <SubmitButton size="sm" variant="secondary">Reply</SubmitButton>
    </form>
  );
}
