import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Heart, MessageSquare, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireVerified } from "@/lib/auth/guards";
import { deleteComment, deletePost, joinCommunity, leaveCommunity, toggleLike } from "@/features/communities/actions";
import { startChatWith } from "@/features/messaging/actions";
import { CreatePostForm } from "@/components/community/create-post-form";
import { CommentForm } from "@/components/community/comment-form";
import { ReportButton } from "@/components/common/report-button";
import { Button } from "@/components/ui/button";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { cn, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Community" };

type Author = { id: string; full_name: string; designation: string; company: { name: string } | null } | null;
type Post = { id: string; body: string; created_at: string; author_id: string; author: Author };
type Comment = { id: string; post_id: string; body: string; created_at: string; author_id: string; author: { full_name: string } | null };

export default async function CommunityPage({ params }: { params: Promise<{ slug: string }> }) {
  const viewer = await requireVerified();
  const { slug } = await params;
  if (!/^[a-z0-9-]+$/.test(slug)) notFound();
  const supabase = await createClient();

  const { data: community } = await supabase.from("communities").select("id, slug, name, description").eq("slug", slug).maybeSingle();
  if (!community) notFound();

  const [{ data: membership }, { data: postsRaw }] = await Promise.all([
    supabase.from("community_members").select("user_id").eq("community_id", community.id).eq("user_id", viewer.id).maybeSingle(),
    supabase.from("community_posts")
      .select("id, body, created_at, author_id, author:profiles!community_posts_author_id_fkey(id, full_name, designation, company:companies(name))")
      .eq("community_id", community.id).eq("is_removed", false)
      .order("created_at", { ascending: false }).limit(30),
  ]);
  const posts = (postsRaw ?? []) as unknown as Post[];
  const ids = posts.map((p) => p.id);
  const [{ data: likes }, { data: commentsRaw }] = ids.length
    ? await Promise.all([
        supabase.from("post_likes").select("post_id, user_id").in("post_id", ids),
        supabase.from("post_comments").select("id, post_id, body, created_at, author_id, author:profiles(full_name)").in("post_id", ids).order("created_at"),
      ])
    : [{ data: [] }, { data: [] }];
  const comments = (commentsRaw ?? []) as unknown as Comment[];
  const isMember = !!membership;
  const isMod = viewer.profile.role !== "member";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/communities" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Communities</Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{community.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{community.description}</p>
        </div>
        <form action={(isMember ? leaveCommunity : joinCommunity).bind(null, community.id, community.slug)}>
          <Button variant={isMember ? "outline" : "default"} size="sm">{isMember ? "Leave" : "Join community"}</Button>
        </form>
      </div>

      {isMember ? <CreatePostForm communityId={community.id} slug={community.slug} communityName={community.name} /> : null}

      {posts.length === 0 ? (
        <EmptyState icon={<MessageSquare />} title="No posts yet">{isMember ? "Start the conversation." : "Join to start the conversation."}</EmptyState>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => {
            const postLikes = (likes ?? []).filter((l) => l.post_id === p.id);
            const liked = postLikes.some((l) => l.user_id === viewer.id);
            const postComments = comments.filter((c) => c.post_id === p.id);
            const mine = p.author_id === viewer.id;
            return (
              <li key={p.id} className="rounded-lg border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <Avatar name={p.author?.full_name ?? "?"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm">
                        <span className="font-medium">{p.author?.full_name}</span>
                        <span className="text-muted-foreground"> · {p.author?.designation}, {p.author?.company?.name} · {timeAgo(p.created_at)}</span>
                      </p>
                      {mine || isMod ? (
                        <form action={deletePost.bind(null, p.id, community.slug)}>
                          <button aria-label="Delete post" className="text-muted-foreground hover:text-destructive cursor-pointer"><Trash2 className="size-4" /></button>
                        </form>
                      ) : null}
                    </div>
                    <p className="mt-2 whitespace-pre-line break-words text-sm">{p.body}</p>
                    <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                      <form action={toggleLike.bind(null, p.id, liked, community.slug)}>
                        <button className={cn("flex items-center gap-1 cursor-pointer hover:text-foreground", liked && "text-destructive")} aria-pressed={liked}>
                          <Heart className={cn("size-4", liked && "fill-current")} /> {postLikes.length}
                        </button>
                      </form>
                      <span className="flex items-center gap-1"><MessageSquare className="size-4" /> {postComments.length}</span>
                      {!mine ? (
                        <form action={startChatWith.bind(null, p.author_id)}><button className="hover:text-foreground cursor-pointer">Message</button></form>
                      ) : null}
                      {!mine ? <span className="ml-auto"><ReportButton targetType="post" targetId={p.id} /></span> : null}
                    </div>
                    {postComments.length ? (
                      <ul className="mt-3 space-y-2 border-l-2 pl-3">
                        {postComments.map((c) => (
                          <li key={c.id} className="text-sm group flex items-start justify-between gap-2">
                            <p><span className="font-medium">{c.author?.full_name}</span> <span className="text-muted-foreground text-xs">{timeAgo(c.created_at)}</span><br />{c.body}</p>
                            {c.author_id === viewer.id || isMod ? (
                              <form action={deleteComment.bind(null, c.id, community.slug)}>
                                <button aria-label="Delete comment" className="opacity-60 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 text-muted-foreground hover:text-destructive cursor-pointer"><Trash2 className="size-3.5" /></button>
                              </form>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {isMember ? <div className="mt-3"><CommentForm postId={p.id} slug={community.slug} /></div> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
