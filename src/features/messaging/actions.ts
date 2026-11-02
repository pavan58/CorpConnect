"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { verifiedOrNull } from "@/lib/auth/guards";

const uuid = z.string().uuid();

/** Open (or reuse) a 1-on-1 chat with another verified member. */
export async function startChatWith(peerId: string) {
  const viewer = await verifiedOrNull();
  if (!viewer || !uuid.safeParse(peerId).success || peerId === viewer.id) redirect("/messages");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_conversation", { p_peer: peerId });
  if (error || !data) redirect("/messages?error=start");
  redirect(`/messages/${data}`);
}

export async function markConversationRead(conversationId: string) {
  const viewer = await verifiedOrNull();
  if (!viewer || !uuid.safeParse(conversationId).success) return;
  const supabase = await createClient();
  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", viewer.id);
}
