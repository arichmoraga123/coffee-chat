"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type QueueItem = {
  id: string;
  lessonId: string;
  lessonTitle: string;
  blockLabel: string | null;
  question: string;
  answer: string | null;
  status: string;
  public: boolean;
  asker: string;
  createdAt: string;
  answeredBy: string | null;
};

function QuestionCard({ item, onSaved }: { item: QueueItem; onSaved: (q: QueueItem) => void }) {
  const [answer, setAnswer] = useState(item.answer ?? "");
  const [isPublic, setIsPublic] = useState(item.public);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/learn/questions/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ answer, public: isPublic }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      onSaved({ ...item, answer, public: isPublic, status: "answered" });
      toast.success(isPublic ? "Answered and added to the lesson as an FAQ" : "Answer sent");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("space-y-2 rounded-[var(--radius-lg)] border p-4", item.status === "open" ? "border-info/40 bg-info-bg" : "border-border bg-surface")}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-2">
        <span className="font-medium text-ink">{item.asker}</span>
        <span>· {new Date(item.createdAt).toLocaleDateString()}</span>
        {item.blockLabel ? (
          <Link href={`/learn/${item.lessonId}#${item.blockLabel.split(" · ")[0]}`} className="text-accent hover:underline">
            · {item.blockLabel}
          </Link>
        ) : null}
        {item.status === "answered" ? <span className="text-success">· answered{item.answeredBy ? ` by ${item.answeredBy}` : ""}</span> : null}
        {item.public ? <span className="text-info">· FAQ on lesson</span> : null}
      </div>
      <p className="text-sm text-ink">{item.question}</p>
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={4}
        placeholder="Write your answer (Markdown works: **bold**, lists)…"
        className="block w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base text-ink"
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-4 w-4 accent-sky-500" />
          Add to lesson as FAQ
        </label>
        <Button type="button" size="sm" disabled={busy || answer.trim().length < 2} onClick={() => void save()}>
          {item.status === "answered" ? "Update answer" : "Send answer"}
        </Button>
      </div>
    </div>
  );
}

export function MentorQueue({ items: initial }: { items: QueueItem[] }) {
  const [items, setItems] = useState(initial);
  const [showAnswered, setShowAnswered] = useState(false);
  const visible = items.filter((i) => showAnswered || i.status === "open");
  const groups = useMemo(() => {
    const m = new Map<string, QueueItem[]>();
    for (const i of visible) m.set(i.lessonId, [...(m.get(i.lessonId) ?? []), i]);
    return Array.from(m.entries()).sort(([a], [b]) => {
      const [am, al] = a.split("-").map(Number);
      const [bm, bl] = b.split("-").map(Number);
      return am - bm || al - bl;
    });
  }, [visible]);
  const openCount = items.filter((i) => i.status === "open").length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 text-sm">
        <span className="text-ink-2">{openCount} open</span>
        <label className="flex items-center gap-2 text-ink-2">
          <input type="checkbox" checked={showAnswered} onChange={(e) => setShowAnswered(e.target.checked)} />
          Show answered (last 30 days)
        </label>
      </div>
      {groups.length === 0 ? <p className="text-sm text-ink-3">Nothing waiting.</p> : null}
      {groups.map(([lessonId, qs]) => (
        <section key={lessonId} className="space-y-2">
          <h2 className="text-sm font-semibold text-ink">
            <Link href={`/learn/${lessonId}`} className="hover:underline">
              {lessonId.replace("-", ".")} · {qs[0].lessonTitle}
            </Link>
            <span className="ml-2 text-xs font-normal text-ink-3">{qs.length}</span>
          </h2>
          {qs.map((q) => (
            <QuestionCard key={q.id} item={q} onSaved={(n) => setItems((all) => all.map((x) => (x.id === n.id ? n : x)))} />
          ))}
        </section>
      ))}
    </div>
  );
}
