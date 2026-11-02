"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { verifiedOrNull } from "@/lib/auth/guards";
import type { ActionState } from "@/lib/action-state";

const uuid = z.string().uuid();
const slug = z.string().regex(/^[a-z0-9-]+$/);

export async function joinCommunity(communityId: string, communitySlug: string) {
  const viewer = await verifiedOrNull();
  if (!viewer || !uuid.safeParse(communityId).success) return;
  const supabase = await createClient();
  await supabase.from("community_members").upsert({ community_id: communityId, user_id: viewer.id }, { ignoreDuplicates: true });
  revalidatePath("/communities");
  if (slug.safeParse(communitySlug).success) revalidatePath(`/communities/${communitySlug}`);
}

export async function leaveCommunity(communityId: string, communitySlug: string) {
  const viewer = await verifiedOrNull();
  if (!viewer || !uuid.safeParse(communityId).success) return;
  const supabase = await createClient();
  await supabase.from("community_members").delete().eq("community_id", communityId).eq("user_id", viewer.id);
  revalidatePath("/communities");
  if (slug.safeParse(communitySlug).success) revalidatePath(`/communities/${communitySlug}`);
}

const postSchema = z.object({
  communityId: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  body: z.string().trim().min(1, "Write something").max(3000, "Keep it under 3000 characters"),
});

export async function createPost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await verifiedOrNull();
  if (!viewer) return { message: "Only verified employees can post." };
  const parsed = postSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  const { error } = await supabase.from("community_posts").insert({
    community_id: parsed.data.communityId,
    author_id: viewer.id,
    body: parsed.data.body,
  });
  if (error) return { message: "Join the community to post here." };
  revalidatePath(`/communities/${parsed.data.slug}`);
  return { ok: true };
}

export async function deletePost(postId: string, communitySlug: string) {
  const viewer = await verifiedOrNull();
  if (!viewer || !uuid.safeParse(postId).success) return;
  const supabase = await createClient();
  await supabase.from("community_posts").delete().eq("id", postId);
  if (slug.safeParse(communitySlug).success) revalidatePath(`/communities/${communitySlug}`);
}

export async function toggleLike(postId: string, liked: boolean, communitySlug: string) {
  const viewer = await verifiedOrNull();
  if (!viewer || !uuid.safeParse(postId).success) return;
  const supabase = await createClient();
  if (liked) await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", viewer.id);
  else await supabase.from("post_likes").upsert({ post_id: postId, user_id: viewer.id }, { ignoreDuplicates: true });
  if (slug.safeParse(communitySlug).success) revalidatePath(`/communities/${communitySlug}`);
}

const commentSchema = z.object({
  postId: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  body: z.string().trim().min(1).max(1000),
});

export async function addComment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await verifiedOrNull();
  if (!viewer) return { message: "Only verified employees can comment." };
  const parsed = commentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Comment can't be empty." };
  const supabase = await createClient();
  const { error } = await supabase.from("post_comments").insert({ post_id: parsed.data.postId, author_id: viewer.id, body: parsed.data.body });
  if (error) return { message: "Join the community to comment." };
  revalidatePath(`/communities/${parsed.data.slug}`);
  return { ok: true };
}

export async function deleteComment(commentId: string, communitySlug: string) {
  const viewer = await verifiedOrNull();
  if (!viewer || !uuid.safeParse(commentId).success) return;
  const supabase = await createClient();
  await supabase.from("post_comments").delete().eq("id", commentId);
  if (slug.safeParse(communitySlug).success) revalidatePath(`/communities/${communitySlug}`);
}
