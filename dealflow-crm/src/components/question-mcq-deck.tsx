"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { PublicMcq, GradeResult } from "@/lib/mcq/types";
import { cn } from "@/lib/utils";

export type McqSessionResult = { questionId: string; correct: boolean; ms: number };

type Props = {
  questions: PublicMcq[];
  /** "drill" = today's daily set (points awarded at the end); "practice" = free practice (+10 on first mastery). */
  context: "drill" | "practice";
  onComplete: (results: McqSessionResult[]) => void;
  onExit?: () => void;
  /** Called after each graded answer, e.g. to update a session panel. */
  onAnswered?: (q: PublicMcq, result: GradeResult, ms: number) => void;
  finishLabel?: string;
  /** Offset when resuming a set part-way (e.g. 2 of 5 already answered). */
  startNumber?: number;
  total?: number;
};

const LETTERS = ["A", "B", "C", "D"];
const norm = (s: string) => s.trim().toLowerCase();

export function QuestionMcqDeck({
  questions,
  context,
  onComplete,
  onExit,
  onAnswered,
  finishLabel,
  startNumber = 0,
  total,
}: Props) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"pick" | "grading" | "show">("pick");
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  const resultsRef = useRef<McqSessionResult[]>([]);
  const startRef = useRef(0);

  const current = questions[index];
  const count = total ?? questions.length + startNumber;
  const number = startNumber + index + 1;

  useEffect(() => {
    setPhase("pick");
    setPicked(null);
    setResult(null);
    startRef.current = Date.now();
  }, [index]);

  const goNext = useCallback(() => {
    if (index + 1 >= questions.length) onComplete(resultsRef.current);
    else setIndex(index + 1);
  }, [index, questions.length, onComplete]);

  const onPick = useCallback(
    async (i: number) => {
      if (phase !== "pick" || !current) return;
      const ms = Date.now() - startRef.current;
      setPicked(i);
      setPhase("grading");
      try {
        const res = await fetch("/api/mcq/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questionId: current.id, chosenText: current.options[i], msToAnswer: ms, context }),
        });
        if (!res.ok) throw new Error();
        const r = (await res.json()) as GradeResult;
        setResult(r);
        setPhase("show");
        resultsRef.current = [...resultsRef.current, { questionId: current.id, correct: r.correct, ms }];
        onAnswered?.(current, r, ms);
      } catch {
        toast.error("Couldn't check that answer. Try again.");
        setPicked(null);
        setPhase("pick");
      }
    },
    [phase, current, context, onAnswered],
  );

  // 1–4 or A–D selects; Enter (or →) goes to the next question.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (phase === "pick" && current) {
        const k = e.key.toUpperCase();
        const i = ["1", "2", "3", "4"].includes(k) ? Number(k) - 1 : LETTERS.indexOf(k);
        if (i >= 0 && i < current.options.length) {
          e.preventDefault();
          void onPick(i);
        }
      } else if (phase === "show" && (e.key === "Enter" || e.key === "ArrowRight")) {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, current, onPick, goNext]);

  if (!current) {
    return <p className="text-sm text-ink-3">No questions in this session.</p>;
  }

  const answeredCount = number - 1 + (phase === "show" ? 1 : 0);
  const correctNorm = result ? norm(result.correctText) : null;

  return (
    <section className="w-full max-w-[820px] rounded-[var(--radius-lg)] border border-border bg-surface p-5 sm:p-6" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-3">
        <span>
          Question {number} of {count}
          {current.lessonId ? ` · Lesson ${current.lessonId.replace("-", ".")}` : ""} · {current.difficulty}
        </span>
        {onExit ? (
          <button type="button" onClick={onExit} className="text-ink-3 hover:text-ink hover:underline">
            End session
          </button>
        ) : null}
      </div>
      <ProgressBar value={answeredCount} max={count} size="sm" className="mt-2" />

      <h2 className="mt-5 whitespace-pre-wrap text-[19px] font-medium leading-snug text-ink [overflow-wrap:anywhere]">
        {current.question}
      </h2>

      <div className="mt-5 flex flex-col gap-2.5" role="group" aria-label="Answer options">
        {current.options.map((text, i) => {
          const isPicked = picked === i;
          const isCorrect = phase === "show" && norm(text) === correctNorm;
          const isWrong = phase === "show" && isPicked && !isCorrect;
          const dim = phase === "show" && !isCorrect && !isWrong;
          return (
            <button
              key={`${current.id}-${i}`}
              type="button"
              disabled={phase !== "pick"}
              onClick={() => void onPick(i)}
              className={cn(
                "flex min-h-14 w-full items-start gap-3 rounded-[var(--radius)] border px-4 py-3 text-left text-[15px] leading-relaxed transition-colors [overflow-wrap:anywhere]",
                phase === "pick" && "border-border-strong bg-surface text-ink hover:border-accent hover:bg-accent-tint",
                phase === "grading" && (isPicked ? "border-accent bg-accent-tint text-ink" : "border-border text-ink-3"),
                isCorrect && "border-success bg-success-bg text-ink",
                isWrong && "border-danger bg-danger-bg text-ink",
                dim && "border-border text-ink-3",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border text-xs font-semibold",
                  isCorrect ? "border-success bg-success text-white" : isWrong ? "border-danger bg-danger text-white" : "border-border-strong text-ink-2",
                )}
                aria-hidden
              >
                {LETTERS[i]}
              </span>
              <span className="min-w-0 flex-1">
                {text}
                {isCorrect ? <span className="mt-1 block text-xs font-semibold text-success">Correct answer</span> : null}
                {isWrong ? <span className="mt-1 block text-xs font-semibold text-danger">Your answer</span> : null}
              </span>
            </button>
          );
        })}
      </div>

      {phase === "show" && result ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-[var(--radius)] border border-border bg-surface-2 p-4">
            <p className="text-sm font-semibold text-ink">
              {result.correct ? "Correct" : "Not quite"}
              {result.xpAwarded ? <span className="font-normal text-ink-3"> · +{result.xpAwarded} points</span> : null}
            </p>
            {result.explanation ? (
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{result.explanation}</p>
            ) : null}
            {result.lessonId ? (
              <Link href={`/learn/${result.lessonId}`} target="_blank" className="mt-2 inline-block text-sm font-medium text-accent hover:underline">
                Review lesson {result.lessonId.replace("-", ".")}
              </Link>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="hidden text-[13px] text-ink-3 sm:inline">Press Enter for next</span>
            <Button variant="primary" onClick={goNext} autoFocus>
              {index + 1 >= questions.length ? (finishLabel ?? "Finish") : "Next question"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-4 hidden text-[13px] text-ink-3 sm:block">
          {phase === "grading" ? "Checking…" : "Keys: 1–4 or A–D to answer · Enter for next"}
        </p>
      )}
    </section>
  );
}
