"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";

type ChatMsg = { role: "user" | "assistant"; content: string };
type MyQuestion = { id: string; question: string; answer: string | null; status: string; blockId: string | null; createdAt: string };

export function LessonHelp({
  lessonId,
  lessonTitle,
  blocks,
  myQuestions,
}: {
  lessonId: string;
  lessonTitle: string;
  blocks: { id: string; label: string }[];
  myQuestions: MyQuestion[];
}) {
  const [tutorOpen, setTutorOpen] = useState(false);
  const [mentorOpen, setMentorOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [question, setQuestion] = useState("");
  const [blockId, setBlockId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mine, setMine] = useState(myQuestions);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  useEffect(() => {
    if (!tutorOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setTutorOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tutorOpen]);

  const ask = async () => {
    const text = draft.trim();
    if (!text || streaming) return;
    const history = [...messages, { role: "user" as const, content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setDraft("");
    setStreaming(true);
    try {
      const res = await fetch("/api/learn/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ lessonId, messages: history }),
      });
      if (!res.ok || !res.body) {
        const err = ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "The tutor is unavailable right now.";
        setMessages([...history, { role: "assistant", content: `_${err}_` }]);
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: acc }]);
      }
    } catch {
      setMessages([...history, { role: "assistant", content: "_Network error — try again._" }]);
    } finally {
      setStreaming(false);
    }
  };

  const submitMentor = async () => {
    if (question.trim().length < 10) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/learn/mentor-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ lessonId, blockId: blockId || null, question: question.trim() }),
      });
      const data = (await res.json()) as { question?: MyQuestion; error?: string };
      if (!res.ok || !data.question) throw new Error(data.error ?? "Couldn't send your question");
      setMine((m) => [data.question as MyQuestion, ...m]);
      setQuestion("");
      setBlockId("");
      setMentorOpen(false);
      toast.success("Sent to the PE@Broad mentors — you'll see the answer here.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send your question");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-[var(--radius-lg)] border border-border bg-surface p-6">
      <p className="text-sm font-semibold text-ink">Stuck on something?</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={() => setTutorOpen(true)}>
          Ask about this lesson (AI tutor)
        </Button>
        <Button type="button" variant="outline" onClick={() => setMentorOpen((o) => !o)}>
          Still stuck? Ask a PE@Broad mentor
        </Button>
      </div>

      {mentorOpen ? (
        <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
          <label className="block text-xs text-ink-2">
            Which part? (optional)
            <select
              value={blockId}
              onChange={(e) => setBlockId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border-strong bg-surface px-2 py-2 text-base text-ink"
            >
              <option value="">The whole lesson</option>
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.id} · {b.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-ink-2">
            Your question
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="e.g. Why does the mid-year convention use 4.5 for the terminal value?"
              className="mt-1 block w-full rounded-md border border-border-strong bg-surface px-2 py-2 text-base text-ink"
            />
          </label>
          <Button type="button" size="sm" disabled={submitting || question.trim().length < 10} onClick={() => void submitMentor()}>
            {submitting ? "Sending…" : "Send to mentors"}
          </Button>
        </div>
      ) : null}

      {mine.length ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Your questions</p>
          {mine.map((q) => (
            <div key={q.id} className="rounded-lg border border-border bg-surface p-3 text-sm">
              <p className="text-ink">{q.question}</p>
              {q.answer ? (
                <div className="mt-2 border-l-2 border-success/40 pl-3">
                  <p className="text-xs font-semibold text-success">Mentor answer</p>
                  <Markdown className="text-sm">{q.answer}</Markdown>
                </div>
              ) : (
                <p className="mt-1 text-xs text-warn">Waiting for a mentor…</p>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {tutorOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setTutorOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Lesson tutor"
            className="flex h-full w-full max-w-md flex-col border-l border-border-strong bg-surface"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border p-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">Tutor</p>
                <p className="truncate text-xs text-ink-3">{lessonTitle}</p>
              </div>
              <button type="button" onClick={() => setTutorOpen(false)} className="rounded px-2 py-1 text-xs text-ink-2 hover:bg-surface-2">
                Close
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-3">
              {messages.length === 0 ? (
                <p className="text-sm text-ink-2">
                  Ask anything about this lesson — e.g. &ldquo;Why is the cost of equity higher than the cost of debt?&rdquo; The
                  tutor teaches the reasoning rather than handing out workbook answers.
                </p>
              ) : null}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg p-3 text-sm",
                    m.role === "user" ? "ml-8 bg-accent-tint text-ink" : "mr-4 border border-border bg-surface",
                  )}
                >
                  {m.role === "assistant" ? (
                    m.content ? <Markdown className="text-sm">{m.content}</Markdown> : <span className="animate-pulse text-ink-3">Thinking…</span>
                  ) : (
                    m.content
                  )}
                </div>
              ))}
              <div ref={endRef} />
            </div>
            <form
              className="flex gap-2 border-t border-border p-3"
              onSubmit={(e) => {
                e.preventDefault();
                void ask();
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask a question…"
                maxLength={1500}
                className="min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-3 py-2 text-base text-ink"
              />
              <Button type="submit" disabled={streaming || !draft.trim()}>
                Send
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
