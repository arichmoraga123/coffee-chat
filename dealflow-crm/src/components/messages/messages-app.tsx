"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNowStrict, isToday } from "date-fns";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CountPill } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { subscribeToThread, subscribeToUnread } from "@/lib/realtime";
import { cn } from "@/lib/utils";

type Conv = {
  id: string;
  other: { id: string; name: string };
  last: { body: string; senderId: string; kind: string; createdAt: string } | null;
  unread: number;
  muted: boolean;
  blocked: boolean;
};
type Msg = { id: string; senderId: string; body: string; kind: string; challengeId: string | null; createdAt: string };
type Thread = { messages: Msg[]; other: { id: string; name: string } | null; muted: boolean; blockedByMe: boolean; blockedByThem: boolean };

export function MessagesApp({ me, initialId }: { me: string; initialId: string | null }) {
  const router = useRouter();
  const [convs, setConvs] = useState<Conv[] | null>(null);
  const [active, setActive] = useState<string | null>(initialId);

  const loadInbox = useCallback(async () => {
    const res = await fetch("/api/messages");
    if (res.ok) setConvs(((await res.json()) as { conversations: Conv[] }).conversations);
  }, []);

  useEffect(() => {
    void loadInbox();
    return subscribeToUnread(() => void loadInbox());
  }, [loadInbox]);

  const open = (id: string) => {
    setActive(id);
    router.replace(`/messages?c=${id}`, { scroll: false });
  };

  return (
    <div className="grid h-[calc(100vh-220px)] min-h-[480px] grid-cols-[minmax(0,1fr)] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface md:grid-cols-[300px_minmax(0,1fr)]">
      <aside className={cn("min-h-0 overflow-y-auto border-r border-border", active && "hidden md:block")}>
        {convs === null ? (
          <p className="p-4 text-sm text-ink-3">Loading…</p>
        ) : convs.length === 0 ? (
          <div className="p-4 text-sm text-ink-3">
            No conversations yet. Open a member&apos;s profile from{" "}
            <Link href="/club/pe-broad/members" className="text-accent hover:underline">
              Members
            </Link>{" "}
            and press Message.
          </div>
        ) : (
          <ul>
            {convs.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => open(c.id)}
                  className={cn("flex w-full items-center gap-3 border-b border-divider px-4 py-3 text-left hover:bg-surface-2", active === c.id && "bg-accent-tint")}
                >
                  <Avatar name={c.other.name} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate text-sm text-ink", c.unread && "font-semibold")}>{c.other.name}</span>
                      {c.last ? <span className="shrink-0 text-xs text-ink-3">{formatDistanceToNowStrict(new Date(c.last.createdAt))}</span> : null}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[13px] text-ink-3">
                        {c.blocked ? "Blocked" : c.last ? `${c.last.senderId === me ? "You: " : ""}${c.last.kind === "challenge" ? "Sent a challenge" : c.last.body}` : "No messages yet"}
                      </span>
                      <CountPill count={c.unread} />
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
      <section className={cn("min-h-0", !active && "hidden md:block")}>
        {active ? (
          <ThreadView key={active} id={active} me={me} onBack={() => setActive(null)} onChange={() => void loadInbox()} />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <EmptyState title="Pick a conversation." className="border-0" />
          </div>
        )}
      </section>
    </div>
  );
}

function ThreadView({ id, me, onBack, onChange }: { id: string; me: string; onBack: () => void; onChange: () => void }) {
  const [thread, setThread] = useState<Thread | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const lastAt = useRef<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/messages/${id}`);
    if (!res.ok) return;
    const t = (await res.json()) as Thread;
    setThread(t);
    lastAt.current = t.messages.at(-1)?.createdAt ?? null;
    onChange();
  }, [id, onChange]);

  const poll = useCallback(async () => {
    const q = lastAt.current ? `?after=${encodeURIComponent(lastAt.current)}` : "";
    const res = await fetch(`/api/messages/${id}${q}`);
    if (!res.ok) return;
    const t = (await res.json()) as Thread;
    if (t.messages.length) {
      setThread((prev) => (prev ? { ...t, messages: [...prev.messages, ...t.messages.filter((m) => !prev.messages.some((p) => p.id === m.id))] } : t));
      lastAt.current = t.messages.at(-1)!.createdAt;
    } else setThread((prev) => (prev ? { ...prev, blockedByMe: t.blockedByMe, blockedByThem: t.blockedByThem, muted: t.muted } : prev));
  }, [id]);

  useEffect(() => {
    void load();
    return subscribeToThread(id, () => void poll());
  }, [id, load, poll]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread?.messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    const res = await fetch(`/api/messages/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) });
    setSending(false);
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      return toast.error(d.error ?? "Couldn't send.");
    }
    setDraft("");
    await poll();
    onChange();
  };

  const patch = async (data: { muted?: boolean; blocked?: boolean }) => {
    const res = await fetch(`/api/messages/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) return toast.error("Couldn't update.");
    setThread((t) => (t ? { ...t, ...(data.muted !== undefined ? { muted: data.muted } : {}), ...(data.blocked !== undefined ? { blockedByMe: data.blocked } : {}) } : t));
    onChange();
  };

  const report = async () => {
    const reason = prompt("What happened? An admin will review this conversation.");
    if (!reason) return;
    const res = await fetch(`/api/messages/${id}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
    if (res.ok) toast("Reported to admins.");
    else toast.error("Couldn't send the report.");
  };

  if (!thread) return <p className="p-4 text-sm text-ink-3">Loading…</p>;
  const blocked = thread.blockedByMe || thread.blockedByThem;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <button type="button" onClick={onBack} className="mr-1 text-sm text-ink-3 md:hidden" aria-label="Back to inbox">
          ←
        </button>
        {thread.other ? (
          <Link href={`/club/pe-broad/members/${thread.other.id}`} className="flex min-w-0 flex-1 items-center gap-2 hover:underline">
            <Avatar name={thread.other.name} size={28} />
            <span className="truncate font-medium text-ink">{thread.other.name}</span>
          </Link>
        ) : (
          <span className="flex-1" />
        )}
        {thread.other && !blocked ? (
          <Button size="sm" variant="secondary" asChild>
            <Link href={`/challenges/new?to=${thread.other.id}&conversation=${id}`}>Challenge</Link>
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={() => void patch({ muted: !thread.muted })}>
          {thread.muted ? "Unmute" : "Mute"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => (thread.blockedByMe || confirm("Block this member? Neither of you will be able to send messages here.")) && void patch({ blocked: !thread.blockedByMe })}
        >
          {thread.blockedByMe ? "Unblock" : "Block"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void report()}>
          Report
        </Button>
      </header>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {thread.messages.length === 0 ? <p className="text-center text-sm text-ink-3">Say hi.</p> : null}
        {thread.messages.map((m) => {
          const mine = m.senderId === me;
          const at = new Date(m.createdAt);
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-[var(--radius-lg)] px-3.5 py-2 text-sm [overflow-wrap:anywhere]",
                  m.kind === "challenge" ? "border border-accent bg-accent-tint text-ink" : mine ? "bg-accent text-on-accent" : "bg-surface-2 text-ink",
                )}
              >
                {m.kind === "challenge" && m.challengeId ? (
                  <>
                    <p className="eyebrow">Challenge</p>
                    <p className="mt-1 whitespace-pre-wrap">{m.body}</p>
                    <Link href={`/challenges/${m.challengeId}`} className="mt-2 inline-block font-medium text-accent hover:underline">
                      Open challenge
                    </Link>
                  </>
                ) : (
                  <p className="whitespace-pre-wrap">{m.body}</p>
                )}
                <p className={cn("mt-1 text-[11px]", mine && m.kind !== "challenge" ? "text-on-accent/70" : "text-ink-3")}>
                  {isToday(at) ? format(at, "h:mm a") : format(at, "MMM d, h:mm a")}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {blocked ? (
        <p className="border-t border-border px-4 py-3 text-sm text-ink-3">
          {thread.blockedByMe ? "You blocked this member. Unblock to send messages." : "You can't send messages in this conversation."}
        </p>
      ) : (
        <form
          className="flex items-end gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 2000))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder="Write a message"
            aria-label="Message"
            className="max-h-32 min-h-10 flex-1 resize-none rounded-[var(--radius)] border border-border-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3 focus-visible:border-accent focus-visible:outline-none"
          />
          <Button type="submit" variant="primary" disabled={sending || !draft.trim()}>
            Send
          </Button>
        </form>
      )}
    </div>
  );
}
