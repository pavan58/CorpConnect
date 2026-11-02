"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader2, SendHorizontal, WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { markConversationRead } from "@/features/messaging/actions";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  pending?: boolean;
  failed?: boolean;
};

const MAX_LEN = 4000;

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

/**
 * Realtime 1-on-1 chat. New rows arrive via Supabase Realtime postgres_changes,
 * which applies the messages RLS policy per subscriber — only the two members
 * of the conversation receive them. Sends go straight to the table (RLS checks
 * sender = auth.uid() and membership).
 */
export function ChatWindow({ conversationId, currentUserId, initialMessages }: {
  conversationId: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
}) {
  const supabase = createClient();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"connecting" | "live" | "offline">("connecting");
  const bottom = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  const upsert = useCallback((m: ChatMessage) => {
    setMessages((prev) => {
      const i = prev.findIndex((x) => x.id === m.id);
      if (i === -1) return [...prev, m].sort((a, b) => a.created_at.localeCompare(b.created_at));
      const next = [...prev];
      next[i] = { ...m, pending: false, failed: false };
      return next;
    });
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          upsert(payload.new as ChatMessage);
          if ((payload.new as ChatMessage).sender_id !== currentUserId) void markConversationRead(conversationId);
        },
      )
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setStatus("live");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") setStatus("offline");
      });

    void markConversationRead(conversationId);
    return () => { void supabase.removeChannel(channel); };
  }, [supabase, conversationId, currentUserId, upsert]);

  // Catch up on anything missed while the socket was down.
  useEffect(() => {
    if (status !== "live") return;
    const last = messages.filter((m) => !m.pending).at(-1)?.created_at;
    if (!last) return;
    void supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at")
      .eq("conversation_id", conversationId)
      .gt("created_at", last)
      .order("created_at")
      .then(({ data }) => data?.forEach((m) => upsert(m as ChatMessage)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useLayoutEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(body: string, id = crypto.randomUUID()) {
    const optimistic: ChatMessage = {
      id, conversation_id: conversationId, sender_id: currentUserId, body,
      created_at: new Date().toISOString(), pending: true,
    };
    setMessages((prev) => [...prev.filter((m) => m.id !== id), optimistic]);
    const { data, error } = await supabase
      .from("messages")
      .insert({ id, conversation_id: conversationId, sender_id: currentUserId, body })
      .select("id, conversation_id, sender_id, body, created_at")
      .single();
    if (error || !data) {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, pending: false, failed: true } : m)));
      return;
    }
    upsert(data as ChatMessage);
  }

  function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || body.length > MAX_LEN) return;
    setDraft("");
    void send(body);
    textarea.current?.focus();
  }

  let lastDay = "";
  return (
    <div className="flex h-full min-h-0 flex-col">
      {status === "offline" ? (
        <div className="flex items-center gap-2 bg-warning-soft px-4 py-1.5 text-xs text-warning"><WifiOff className="size-3.5" /> Reconnecting… messages you send will still be delivered.</div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-4 space-y-1" aria-live="polite">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Say hello 👋 — agree on a time and a handover spot.</p>
        ) : null}
        {messages.map((m) => {
          const mine = m.sender_id === currentUserId;
          const day = dayLabel(m.created_at);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <div key={m.id}>
              {showDay ? <div className="my-3 text-center text-[11px] uppercase tracking-wide text-muted-foreground">{day}</div> : null}
              <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                  mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border rounded-bl-sm",
                  m.pending && "opacity-70",
                  m.failed && "bg-destructive-soft text-destructive border border-destructive/30",
                )}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={cn("mt-0.5 text-[10px] text-right", mine && !m.failed ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {m.failed ? (
                      <button className="underline cursor-pointer" onClick={() => void send(m.body, m.id)}>Not sent · Retry</button>
                    ) : m.pending ? "Sending…" : time(m.created_at)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>

      <form onSubmit={onSubmit} className="flex items-end gap-2 border-t bg-card p-2 sm:p-3">
        <textarea
          ref={textarea}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); onSubmit(); } }}
          rows={1}
          maxLength={MAX_LEN}
          placeholder="Write a message…"
          aria-label="Message"
          className="max-h-32 min-h-10 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <button type="submit" disabled={!draft.trim()} aria-label="Send"
          className="inline-flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-50 cursor-pointer">
          {status === "connecting" ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontal className="size-4" />}
        </button>
      </form>
    </div>
  );
}
