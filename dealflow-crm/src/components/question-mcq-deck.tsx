"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { PublicMcq, GradeResult } from "@/lib/mcq/types";
import { cn } from "@/lib/utils";

export type McqSessionResult = { questionId: string; correct: boolean };

type Props = {
  questions: PublicMcq[];
  /** "drill" = today's daily set (XP awarded at the end); "practice" = free practice (+10 XP on first mastery). */
  context: "drill" | "practice";
  onComplete: (results: McqSessionResult[]) => void;
  onExit: () => void;
  /** Called after each graded answer, e.g. to update a session panel. */
  onAnswered?: (q: PublicMcq, result: GradeResult) => void;
  finishLabel?: string;
};

const LETTERS = ["A", "B", "C", "D"];
const CHOICE_CLASS =
  "w-full h-auto min-h-[60px] overflow-visible whitespace-normal break-words [overflow-wrap:anywhere] rounded-xl border px-4 py-3 text-left text-sm leading-relaxed sm:text-[15px]";

export function QuestionMcqDeck({ questions, context, onComplete, onExit, onAnswered, finishLabel }: Props) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"pick" | "grading" | "show">("pick");
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const resultsRef = useRef<McqSessionResult[]>([]);
  const startRef = useRef(0);

  const current = questions[index];

  useEffect(() => {
    setPhase("pick");
    setPicked(null);
    setResult(null);
    startRef.current = Date.now();
    setElapsed(0);
  }, [index]);

  useEffect(() => {
    if (phase !== "pick") return;
    const t = window.setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => window.clearInterval(t);
  }, [phase, index]);

  const goNext = useCallback(() => {
    if (index + 1 >= questions.length) onComplete(resultsRef.current);
    else setIndex(index + 1);
  }, [index, questions.length, onComplete]);

  const onPick = useCallback(
    async (i: number) => {
      if (phase !== "pick" || !current) return;
      setPicked(i);
      setPhase("grading");
      try {
        const res = await fetch("/api/mcq/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: current.id,
            chosenText: current.options[i],
            msToAnswer: Date.now() - startRef.current,
            context,
          }),
        });
        if (!res.ok) throw new Error();
        const r = (await res.json()) as GradeResult;
        setResult(r);
        setPhase("show");
        resultsRef.current = [...resultsRef.current, { questionId: current.id, correct: r.correct }];
        if (r.correct) {
          setCorrectCount((c) => c + 1);
          setStreak((s) => s + 1);
        } else setStreak(0);
        if (r.xpAwarded > 0) toast.success(`+${r.xpAwarded} XP`, { duration: 1200 });
        onAnswered?.(current, r);
      } catch {
        toast.error("Couldn't check that answer — try again.");
        setPicked(null);
        setPhase("pick");
      }
    },
    [phase, current, context, onAnswered],
  );

  // Keyboard: 1–4 / A–D to answer, Enter or → for next.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT")) return;
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
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-zinc-400">
        <p>No questions in this session.</p>
        <Button variant="outline" onClick={onExit}>
          Close
        </Button>
      </div>
    );
  }

  const answered = index + (phase === "show" ? 1 : 0);
  const pct = Math.round((answered / questions.length) * 100);
  const correctNorm = result?.correctText.trim().toLowerCase();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-400">
        <span>
          Question {index + 1} of {questions.length}
        </span>
        <div className="flex items-center gap-3 font-mono text-xs">
          <span title="Correct so far" className="text-emerald-300">
            ✓ {correctCount}/{answered}
          </span>
          <span title="Current streak" className={cn(streak >= 3 ? "text-orange-300" : "text-zinc-500")}>
            🔥 {streak}
          </span>
          <span title="Time on this question" className={cn(elapsed > 45 ? "text-amber-300" : "text-zinc-500")}>
            ⏱ {elapsed}s
          </span>
          <Button size="sm" variant="outline" type="button" onClick={onExit}>
            Exit
          </Button>
        </div>
      </div>
      <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-zinc-800/90 ring-1 ring-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#3d5d8c] via-[#4a6fa5] to-[#5a7fb5] transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 overflow-y-auto pb-4">
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-zinc-900/90 to-zinc-950 px-4 py-4 shadow-inner sm:p-6">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
            <span>{current.category}</span>
            {current.lessonId ? <span className="normal-case tracking-normal">· Lesson {current.lessonId.replace("-", ".")}</span> : null}
            <span
              className={cn(
                "rounded px-1.5 py-0.5 normal-case tracking-normal",
                current.difficulty === "Hard"
                  ? "bg-red-950/60 text-red-300"
                  : current.difficulty === "Medium"
                    ? "bg-amber-950/60 text-amber-300"
                    : "bg-emerald-950/60 text-emerald-300",
              )}
            >
              {current.difficulty}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-base font-medium leading-relaxed text-zinc-100 [overflow-wrap:anywhere] sm:text-lg">
            {current.question}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {current.options.map((text, i) => {
            const isPicked = picked === i;
            const isCorrect = phase === "show" && text.trim().toLowerCase() === correctNorm;
            const isWrong = phase === "show" && isPicked && !isCorrect;
            return (
              <button
                key={`${current.id}-${i}`}
                type="button"
                disabled={phase !== "pick"}
                onClick={() => void onPick(i)}
                className={cn(
                  CHOICE_CLASS,
                  "flex items-start gap-3 transition-all duration-200",
                  phase === "pick" &&
                    "border-white/10 bg-zinc-950/90 hover:border-[#4a6fa5]/50 hover:bg-zinc-900/95 hover:shadow-[0_0_20px_-8px_rgba(74,111,165,0.3)]",
                  phase === "grading" && (isPicked ? "border-[#4a6fa5] bg-zinc-900" : "border-white/[0.06] opacity-60"),
                  isCorrect && "animate-df-flash-green border-emerald-500/70 bg-emerald-950/50 text-emerald-50",
                  isWrong && "animate-df-shake border-red-500/80 bg-red-950/50 text-red-50",
                  phase === "show" && !isCorrect && !isWrong && "border-white/[0.06] opacity-50",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold",
                    isCorrect
                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                      : isWrong
                        ? "border-red-400 bg-red-500/20 text-red-200"
                        : "border-zinc-600 text-zinc-400",
                  )}
                >
                  {LETTERS[i]}
                </span>
                <span className="min-w-0 flex-1">{text}</span>
              </button>
            );
          })}
        </div>

        {phase === "show" && result ? (
          <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4 text-sm shadow-inner">
            <p className="mb-2 text-sm font-semibold">
              {result.correct ? (
                <span className="text-emerald-400">Correct{result.xpAwarded ? ` · +${result.xpAwarded} XP` : ""}</span>
              ) : (
                <span className="text-red-400">Incorrect · it&apos;ll come back for review</span>
              )}
            </p>
            {result.explanation ? (
              <p className="whitespace-pre-wrap leading-relaxed text-zinc-200">{result.explanation}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              {result.lessonId ? (
                <Link
                  href={`/learn/${result.lessonId}`}
                  target="_blank"
                  className="text-xs font-medium text-[#a8c0e6] hover:underline"
                >
                  Review lesson {result.lessonId.replace("-", ".")} ↗
                </Link>
              ) : (
                <span className="hidden text-xs text-zinc-500 sm:inline">Press Enter for next</span>
              )}
              <Button type="button" onClick={goNext} autoFocus>
                {index + 1 >= questions.length ? (finishLabel ?? "Finish") : "Next question →"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="hidden text-xs text-zinc-600 sm:block">
            {phase === "grading" ? "Checking…" : "Keys: 1–4 or A–D to answer · Enter for next"}
          </p>
        )}
      </div>
    </div>
  );
}
