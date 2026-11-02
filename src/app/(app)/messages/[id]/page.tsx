import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireVerified } from "@/lib/auth/guards";
import { ChatWindow, type ChatMessage } from "@/components/messaging/chat-window";
import { Avatar } from "@/components/ui/misc";
import { ReportButton } from "@/components/common/report-button";
import { formatInr } from "@/lib/utils";

export const metadata: Metadata = { title: "Chat" };

type Conv = { id: string; listing: { id: string; title: string; price_inr: number; status: string } | null };
type Peer = { user_id: string; profile: { full_name: string; designation: string; company: { name: string } | null } | null };

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireVerified();
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const supabase = await createClient();

  // RLS returns nothing unless the viewer is a member of this conversation.
  const { data: conv } = await supabase
    .from("conversations").select("id, listing:product_listings(id, title, price_inr, status)").eq("id", id).maybeSingle();
  if (!conv) notFound();
  const c = conv as unknown as Conv;

  const [{ data: peerRaw }, { data: msgs }] = await Promise.all([
    supabase.from("conversation_members")
      .select("user_id, profile:profiles(full_name, designation, company:companies(name))")
      .eq("conversation_id", id).neq("user_id", viewer.id).maybeSingle(),
    supabase.from("messages")
      .select("id, conversation_id, sender_id, body, created_at")
      .eq("conversation_id", id).order("created_at", { ascending: false }).limit(150),
  ]);
  const peer = peerRaw as unknown as Peer | null;
  const initial = ((msgs ?? []) as ChatMessage[]).reverse();

  return (
    <div className="mx-auto flex h-[calc(100dvh-9.5rem)] md:h-[calc(100dvh-7.5rem)] max-w-2xl flex-col overflow-hidden rounded-lg border bg-background">
      <div className="flex items-center gap-3 border-b bg-card px-3 py-2.5">
        <Link href="/messages" aria-label="Back to messages" className="rounded-md p-1 hover:bg-muted"><ArrowLeft className="size-5" /></Link>
        <Avatar name={peer?.profile?.full_name ?? "?"} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium flex items-center gap-1">{peer?.profile?.full_name ?? "Member"} <BadgeCheck className="size-3.5 text-success" /></p>
          <p className="truncate text-xs text-muted-foreground">{peer?.profile?.designation} · {peer?.profile?.company?.name}</p>
        </div>
        {peer ? <ReportButton targetType="user" targetId={peer.user_id} /> : null}
      </div>
      {c.listing ? (
        <Link href={`/marketplace/${c.listing.id}`} className="flex items-center justify-between gap-2 border-b bg-accent/50 px-4 py-2 text-xs">
          <span className="truncate">Re: <span className="font-medium">{c.listing.title}</span></span>
          <span className="shrink-0 font-semibold">{formatInr(c.listing.price_inr)}{c.listing.status !== "active" ? ` · ${c.listing.status}` : ""}</span>
        </Link>
      ) : null}
      <ChatWindow conversationId={id} currentUserId={viewer.id} initialMessages={initial} />
    </div>
  );
}
