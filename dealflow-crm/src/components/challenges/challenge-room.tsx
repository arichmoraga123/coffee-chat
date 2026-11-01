"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatTile } from "@/components/ui/stat-tile";
import type { ChallengeView } from "@/lib/challenges";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D"];
type Feedback = { questionId: string; chosen: string; correct: boolean; late: boolean; correctText: string; explanation: string | null; lessonId: string | null };

export function ChallengeRoom({ id, me }: { id: string; me: string }) {
  const [v, setV] = useState<ChallengeView | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);
  const [fetchedAt, setFetchedAt] = useState(0);
  const startRef = useRef(0);

  const load = useCallback(async () => {
    const res = await fetch(`/api/challenges/${id}/state`);
    if (!res.ok) return;
    const d = (await res.json()) as ChallengeView;
    const at = Date.now();
    setFetchedAt(at);
    setNow(at);
    setV((prev) => {
      if (!prev || prev.question?.id !== d.question?.id) startRef.current = Date.now();
      return d;
    });
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Live duels and lobbies poll every second; waiting screens every 5 seconds.
  const pollMs = v && v.mode === "live" && ["accepted", "live"].includes(v.status) ? 1000 : v && !["complete", "expired", "declined"].includes(v.status) ? 5000 : 0;
  useEffect(() => {
    if (!pollMs) return;
    const t = window.setInterval(() => void load(), pollMs);
    return () => window.clearInterval(t);
  }, [pollMs, load]);

  // Local countdown between polls (anchored to the server's msLeft).
  useEffect(() => {
    if (v?.msLeft == null) return;
    const t = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(t);
  }, [v?.msLeft]);

  // In a live duel, clear the feedback once the duel moves on to the next question.
  useEffect(() => {
    if (v?.mode === "live" && feedback && v.question && v.question.id !== feedback.questionId) setFeedback(null);
  }, [v, feedback]);

  const act = async (action: "accept" | "decline" | "ready") => {
    setBusy(true);
    const res = await fetch(`/api/challenges/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    setBusy(false);
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(d.error ?? "Couldn't update.");
    }
    await load();
  };

  const answer = useCallback(
    async (i: number) => {
      if (!v?.question || busy || feedback || v.me?.answeredCurrent) return;
      const q = v.question;
      setBusy(true);
      const res = await fetch(`/api/challenges/${id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, chosenText: q.options[i], ms: Date.now() - startRef.current }),
      });
      setBusy(false);
      const d = (await res.json().catch(() => ({}))) as Partial<Feedback> & { error?: string };
      if (!res.ok) {
        toast.error(d.error ?? "Couldn't submit.");
        await load();
        return;
      }
      setFeedback({ questionId: q.id, chosen: q.options[i], correct: Boolean(d.correct), late: Boolean(d.late), correctText: d.correctText ?? "", explanation: d.explanation ?? null, lessonId: d.lessonId ?? null });
      if (v.mode === "live") void load();
    },
    [v, busy, feedback, id, load],
  );

  const next = useCallback(async () => {
    setFeedback(null);
    // Hide the answered question until the next one arrives, so a quick keypress can't resubmit it.
    setV((prev) => (prev ? { ...prev, question: null } : prev));
    await load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (!feedback && v?.question) {
        const k = e.key.toUpperCase();
        const i = ["1", "2", "3", "4"].includes(k) ? Number(k) - 1 : LETTERS.indexOf(k);
        if (i >= 0 && i < v.question.options.length) {
          e.preventDefault();
          void answer(i);
        }
      } else if (feedback && v?.mode !== "live" && e.key === "Enter") {
        e.preventDefault();
        void next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [feedback, v, answer, next]);

  if (!v) return <p className="text-sm text-ink-3">Loading…</p>;

  const header = (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <Badge tone={v.mode === "live" ? "info" : v.mode === "weekly" ? "accent" : "neutral"}>
        {v.mode === "live" ? "Live duel" : v.mode === "weekly" ? "Weekly club challenge" : "Challenge"}
      </Badge>
      <span className="text-ink-2">
        {v.length} questions · {v.topic}
      </span>
      {v.opponent ? (
        <span className="flex items-center gap-2 text-ink-2">
          vs <Avatar name={v.opponent.name} size={22} /> {v.opponent.name}
        </span>
      ) : null}
    </div>
  );

  if (v.status === "expired" || v.status === "declined") {
    return (
      <div className="space-y-4">
        {header}
        <Card className="p-6 text-sm text-ink-2">{v.status === "declined" ? "This challenge was declined." : "This challenge expired before it was finished."}</Card>
      </div>
    );
  }

  // The invited player hasn't accepted yet.
  if (v.status === "pending" && !v.isCreator) {
    return (
      <div className="space-y-4">
        {header}
        <Card className="p-6">
          <p className="text-sm text-ink">
            <span className="font-medium">{v.opponent?.name}</span> challenged you. Same questions, graded on the server. Most correct wins; ties go to the faster time.
          </p>
          <div className="mt-4 flex gap-2">
            <Button variant="primary" disabled={busy} onClick={() => void act("accept")}>
              Accept
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => void act("decline")}>
              Decline
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Live lobby.
  if (v.mode === "live" && (v.status === "accepted" || v.status === "pending")) {
    return (
      <div className="space-y-4">
        {header}
        <Card className="p-6">
          <p className="section-title">Lobby</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>You: {v.me?.ready ? <span className="text-success">Ready</span> : <span className="text-ink-3">Not ready</span>}</li>
            <li>
              {v.opponent?.name}:{" "}
              {v.status === "pending" ? <span className="text-ink-3">Hasn&apos;t accepted yet</span> : v.opponent?.ready ? <span className="text-success">Ready</span> : <span className="text-ink-3">Not ready</span>}
            </li>
          </ul>
          {v.status === "accepted" && !v.me?.ready ? (
            <Button variant="primary" className="mt-4" disabled={busy} onClick={() => void act("ready")}>
              I&apos;m ready
            </Button>
          ) : (
            <p className="mt-4 text-[13px] text-ink-3">The duel starts as soon as you&apos;re both ready. 30 seconds per question.</p>
          )}
        </Card>
      </div>
    );
  }

  // Results.
  if (v.results) {
    const opp = v.opponent;
    const myScore = v.me?.score ?? 0;
    const won = opp && opp.score !== null ? myScore > opp.score : null;
    return (
      <div className="space-y-4">
        {header}
        <Card className="p-6">
          <p className="eyebrow">Result</p>
          {opp ? (
            <p className="mt-1 text-lg font-semibold text-ink">
              {opp.score === null ? "Waiting for the result" : won ? "You won" : myScore === opp.score ? "Tie on score (time breaks it)" : `${opp.name} won`} · {myScore}–{opp.score ?? "?"}
            </p>
          ) : (
            <p className="mt-1 text-lg font-semibold text-ink">
              You scored {myScore}/{v.length}
            </p>
          )}
          {v.headToHead ? (
            <p className="mt-1 text-[13px] text-ink-3">
              Head to head with {opp?.name}: {v.headToHead.wins}–{v.headToHead.losses}
              {v.headToHead.ties ? `–${v.headToHead.ties}` : ""}
            </p>
          ) : null}
        </Card>
        {v.weeklyTable ? (
          <Card title="Club results so far">
            <ol className="divide-y divide-divider text-sm">
              {v.weeklyTable.map((r, i) => (
                <li key={r.userId} className={cn("flex justify-between py-2", r.userId === me && "font-semibold")}>
                  <span>
                    <span className="mr-2 text-ink-3">{i + 1}</span>
                    {r.name}
                  </span>
                  <span className="text-ink-2">
                    {r.score}/{v.length} · {Math.round(r.totalMs / 1000)}s
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        ) : null}
        <div className="space-y-3">
          {v.results.map((r, i) => (
            <Card key={r.questionId} className="p-5">
              <p className="text-[13px] text-ink-3">
                Question {i + 1}
                {r.lessonId ? ` · Lesson ${r.lessonId.replace("-", ".")}` : ""}
              </p>
              <p className="mt-1 font-medium text-ink">{r.question}</p>
              <p className="mt-2 text-sm text-success">Correct answer: {r.correctText}</p>
              <div className={cn("mt-3 grid gap-3 text-sm", opp && "sm:grid-cols-2")}>
                <AnswerBox label="You" a={r.mine} />
                {opp ? <AnswerBox label={opp.name} a={r.theirs} /> : null}
              </div>
              {r.explanation ? <p className="mt-3 text-sm leading-relaxed text-ink-2">{r.explanation}</p> : null}
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Finished my part (async), waiting on the other player.
  if (v.me?.finished) {
    return (
      <div className="space-y-4">
        {header}
        <Card className="p-6 text-sm text-ink-2">
          You&apos;re done. Results show up once {v.opponent?.name ?? "your opponent"} finishes (or the 48 hours run out).
        </Card>
      </div>
    );
  }

  // Playing.
  const q = v.question;
  const msLeft = v.msLeft == null ? null : Math.max(0, v.msLeft - Math.max(0, now - fetchedAt));
  return (
    <div className="space-y-4">
      {header}
      {q ? (
        <section className="max-w-[820px] rounded-[var(--radius-lg)] border border-border bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-3">
            <span>
              Question {v.index + 1} of {v.length}
              {q.lessonId ? ` · Lesson ${q.lessonId.replace("-", ".")}` : ""} · {q.difficulty}
            </span>
            {v.mode === "live" ? (
              <span className="flex items-center gap-3">
                {v.opponent?.answeredCurrent ? <span className="text-success">Opponent answered ✓</span> : <span>Opponent thinking…</span>}
                <span className={cn("font-semibold", msLeft !== null && msLeft < 8000 ? "text-danger" : "text-ink")}>{msLeft !== null ? Math.ceil(msLeft / 1000) : ""}s</span>
              </span>
            ) : null}
          </div>
          {v.mode === "live" && msLeft !== null ? (
            <ProgressBar value={msLeft} max={30000} size="sm" className="mt-2" />
          ) : (
            <ProgressBar value={v.index} max={v.length} size="sm" className="mt-2" />
          )}
          <h2 className="mt-5 whitespace-pre-wrap text-[19px] font-medium leading-snug text-ink">{q.question}</h2>
          <div className="mt-5 flex flex-col gap-2.5">
            {q.options.map((text, i) => {
              const isChosen = feedback?.chosen === text;
              const isCorrect = feedback && text.trim().toLowerCase() === feedback.correctText.trim().toLowerCase();
              return (
                <button
                  key={`${q.id}-${i}`}
                  type="button"
                  disabled={Boolean(feedback) || busy || Boolean(v.me?.answeredCurrent)}
                  onClick={() => void answer(i)}
                  className={cn(
                    "flex min-h-14 w-full items-start gap-3 rounded-[var(--radius)] border px-4 py-3 text-left text-[15px] leading-relaxed",
                    !feedback && "border-border-strong bg-surface text-ink hover:border-accent hover:bg-accent-tint",
                    feedback && isCorrect && "border-success bg-success-bg text-ink",
                    feedback && isChosen && !isCorrect && "border-danger bg-danger-bg text-ink",
                    feedback && !isChosen && !isCorrect && "border-border text-ink-3",
                  )}
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-border-strong text-xs font-semibold text-ink-2">
                    {LETTERS[i]}
                  </span>
                  <span className="min-w-0 flex-1">
                    {text}
                    {feedback && isCorrect ? <span className="mt-1 block text-xs font-semibold text-success">Correct answer</span> : null}
                    {feedback && isChosen && !isCorrect ? <span className="mt-1 block text-xs font-semibold text-danger">Your answer</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
          {feedback ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-[var(--radius)] border border-border bg-surface-2 p-4 text-sm">
                <p className="font-semibold text-ink">{feedback.late ? "Out of time" : feedback.correct ? "Correct" : "Not quite"}</p>
                {feedback.explanation ? <p className="mt-1.5 leading-relaxed text-ink-2">{feedback.explanation}</p> : null}
              </div>
              {v.mode === "live" ? (
                <p className="text-[13px] text-ink-3">Next question starts when {v.opponent?.name ?? "your opponent"} answers or the timer runs out.</p>
              ) : (
                <div className="flex justify-end">
                  <Button variant="primary" onClick={() => void next()} autoFocus>
                    {v.index + 1 >= v.length ? "See results" : "Next question"}
                  </Button>
                </div>
              )}
            </div>
          ) : v.me?.answeredCurrent ? (
            <p className="mt-4 text-[13px] text-ink-3">You answered. The next question starts when {v.opponent?.name ?? "your opponent"} answers or the timer runs out.</p>
          ) : (
            <p className="mt-4 hidden text-[13px] text-ink-3 sm:block">Keys: 1–4 or A–D</p>
          )}
        </section>
      ) : (
        <Card className="p-6 text-sm text-ink-2">
          {v.status === "pending" ? `Waiting for ${v.opponent?.name ?? "your opponent"} to accept.` : "Loading the next question…"}{" "}
          <Link href="/challenges" className="text-accent hover:underline">
            Back to challenges
          </Link>
        </Card>
      )}
    </div>
  );
}

function AnswerBox({ label, a }: { label: string; a: { chosen: string; correct: boolean; ms: number } | null }) {
  return (
    <div className={cn("rounded-[var(--radius)] border px-3 py-2", !a ? "border-border" : a.correct ? "border-success bg-success-bg" : "border-danger bg-danger-bg")}>
      <p className="text-xs font-semibold text-ink-2">
        {label}
        {a ? ` · ${(a.ms / 1000).toFixed(1)}s` : ""}
      </p>
      <p className="mt-0.5 text-ink">{a ? a.chosen || "No answer" : "Didn't answer"}</p>
    </div>
  );
}
