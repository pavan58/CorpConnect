import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireVerified } from "@/lib/auth/guards";
import { Avatar, EmptyState, PageHeader, Alert } from "@/components/ui/misc";
import { timeAgo, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages" };

type Mine = { conversation_id: string; last_read_at: string; conversation: { last_message_at: string; listing: { title: string } | null } | null };
type Peer = { conversation_id: string; user_id: string; profile: { full_name: string; company: { name: string } | null } | null };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const viewer = await requireVerified();
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: mineRaw } = await supabase
    .from("conversation_members")
    .select("conversation_id, last_read_at, conversation:conversations(last_message_at, listing:product_listings(title))")
    .eq("user_id", viewer.id);
  const mine = ((mineRaw ?? []) as unknown as Mine[])
    .filter((m) => m.conversation)
    .sort((a, b) => b.conversation!.last_message_at.localeCompare(a.conversation!.last_message_at));
  const ids = mine.map((m) => m.conversation_id);

  const [{ data: peersRaw }, { data: recent }] = ids.length
    ? await Promise.all([
        supabase.from("conversation_members")
          .select("conversation_id, user_id, profile:profiles(full_name, company:companies(name))")
          .in("conversation_id", ids).neq("user_id", viewer.id),
        supabase.from("messages")
          .select("conversation_id, sender_id, body, created_at")
          .in("conversation_id", ids).order("created_at", { ascending: false }).limit(300),
      ])
    : [{ data: [] }, { data: [] }];

  const peers = new Map(((peersRaw ?? []) as unknown as Peer[]).map((p) => [p.conversation_id, p]));
  const last = new Map<string, { body: string; sender_id: string; created_at: string }>();
  for (const m of recent ?? []) if (!last.has(m.conversation_id)) last.set(m.conversation_id, m);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Messages" description="Private 1-on-1 chats. Only you and the other member can read them." />
      {error ? <Alert tone="error" className="mb-4">Couldn&apos;t start that chat.</Alert> : null}
      {mine.length === 0 ? (
        <EmptyState icon={<MessagesSquare />} title="No conversations yet">Tap “Chat with seller” on a listing or message a member from their post.</EmptyState>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {mine.map((m) => {
            const peer = peers.get(m.conversation_id)?.profile;
            const lm = last.get(m.conversation_id);
            const unread = lm && lm.sender_id !== viewer.id && lm.created_at > m.last_read_at;
            return (
              <li key={m.conversation_id}>
                <Link href={`/messages/${m.conversation_id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/60">
                  <Avatar name={peer?.full_name ?? "?"} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cn("truncate text-sm", unread ? "font-semibold" : "font-medium")}>{peer?.full_name ?? "Member"} <span className="font-normal text-muted-foreground">· {peer?.company?.name}</span></p>
                      <span className="shrink-0 text-xs text-muted-foreground">{lm ? timeAgo(lm.created_at) : ""}</span>
                    </div>
                    {m.conversation?.listing ? <p className="truncate text-xs text-primary">Re: {m.conversation.listing.title}</p> : null}
                    <p className={cn("truncate text-sm", unread ? "text-foreground" : "text-muted-foreground")}>
                      {lm ? `${lm.sender_id === viewer.id ? "You: " : ""}${lm.body}` : "No messages yet"}
                    </p>
                  </div>
                  {unread ? <span className="size-2.5 rounded-full bg-primary" aria-label="Unread" /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
