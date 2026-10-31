"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  buildMcqFromDrill,
  buildMcqOptions,
  MCQ_CHOICE_BUTTON_CLASS,
  type McqDistractorSource,
  type McqOption,
} from "@/lib/question-mcq";
import type { DrillMcq } from "@/lib/drill-mcq/types";
import { cn } from "@/lib/utils";

export type QuestionMcqRow = {
  id: string;
  question: string;
  answer: string;
  category: string;
  subcategory: string | null;
  difficulty: string;
  tags: string[];
  /** Hand-authored near-miss choices (attached server-side). */
  mcq?: DrillMcq | null;
};

type DrillResult = { questionId: string; action: "known" | "review" | "skip" };

type Props = {
  questions: QuestionMcqRow[];
  distractorPool: McqDistractorSource[];
  onComplete: (results: DrillResult[]) => void;
  onExit: () => void;
  /** When true, PATCH progress after each answer (bank). When false, only accumulate for batch (daily drill). */
  persistEachAnswer?: boolean;
};

const LETTERS = ["A", "B", "C", "D"];
const GENERATED_CACHE_KEY = "df-mcq-generated-v1";

function readGeneratedCache(): Record<string, DrillMcq> {
  try {
    return JSON.parse(sessionStorage.getItem(GENERATED_CACHE_KEY) ?? "{}") as Record<string, DrillMcq>;
  } catch {
    return {};
  }
}

function writeGeneratedCache(v: Record<string, DrillMcq>) {
  try {
    sessionStorage.setItem(GENERATED_CACHE_KEY, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
}

export function QuestionMcqDeck({
  questions,
  distractorPool,
  onComplete,
  onExit,
  persistEachAnswer = false,
}: Props) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"pick" | "show">("pick");
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [generated, setGenerated] = useState<Record<string, DrillMcq>>({});
  const [pending, setPending] = useState<Set<string>>(() => new Set(questions.filter((q) => !q.mcq).map((q) => q.id)));
  const resultsRef = useRef<DrillResult[]>([]);
  const questionStartRef = useRef<number>(0);
  const [elapsed, setElapsed] = useState(0);

  const current = questions[index];

  // Fetch AI-generated near-miss choices for questions that don't have authored ones.
  useEffect(() => {
    const cached = readGeneratedCache();
    setGenerated(cached);
    const need = questions.filter((q) => !q.mcq && !cached[q.id]).map((q) => q.id);
    setPending(new Set(need));
    if (!need.length) return;
    let cancelled = false;
    (async () => {
      for (let i = 0; i < need.length; i += 12) {
        const batch = need.slice(i, i + 12);
        try {
          const res = await fetch("/api/questions/mcq", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ ids: batch }),
          });
          const data = res.ok ? ((await res.json()) as { mcqs?: Record<string, DrillMcq> }) : {};
          if (cancelled) return;
          setGenerated((prev) => {
            const next = { ...prev, ...(data.mcqs ?? {}) };
            writeGeneratedCache(next);
            return next;
          });
        } catch {
          /* fall back to bank-built choices */
        }
        if (cancelled) return;
        setPending((prev) => {
          const next = new Set(prev);
          batch.forEach((id) => next.delete(id));
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [questions]);

  const drill = current ? (current.mcq ?? generated[current.id] ?? null) : null;
  const waitingForChoices = Boolean(current && !drill && pending.has(current.id));

  const options = useMemo<McqOption[]>(() => {
    if (!current || waitingForChoices) return [];
    if (drill) return buildMcqFromDrill(drill);
    return buildMcqOptions(current, distractorPool.length ? distractorPool : [current]);
  }, [current, drill, waitingForChoices, distractorPool]);

  useEffect(() => {
    setPhase("pick");
    setPickedKey(null);
    questionStartRef.current = Date.now();
    setElapsed(0);
  }, [index]);

  useEffect(() => {
    if (phase !== "pick") return;
    const t = window.setInterval(() => setElapsed(Math.floor((Date.now() - questionStartRef.current) / 1000)), 1000);
    return () => window.clearInterval(t);
  }, [phase, index]);

  const patchProgress = useCallback(
    async (questionId: string, correct: boolean) => {
      if (!persistEachAnswer) return;
      await fetch("/api/questions/progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          status: correct ? "known" : "review",
          ...(correct ? { source: "mcq_quiz" } : {}),
        }),
      });
    },
    [persistEachAnswer],
  );

  const goNext = useCallback(() => {
    const nextIndex = index + 1;
    if (nextIndex >= questions.length) onComplete(resultsRef.current);
    else setIndex(nextIndex);
  }, [index, questions.length, onComplete]);

  const onPick = useCallback(
    (opt: McqOption) => {
      if (phase !== "pick" || !current) return;
      setPhase("show");
      setPickedKey(opt.key);
      const correct = opt.isCorrect;
      resultsRef.current = [...resultsRef.current, { questionId: current.id, action: correct ? "known" : "review" }];
      if (correct) {
        setCorrectCount((c) => c + 1);
        setStreak((s) => s + 1);
      } else {
        setStreak(0);
      }
      if (persistEachAnswer) void patchProgress(current.id, correct);
    },
    [phase, current, persistEachAnswer, patchProgress],
  );

  const onSkip = useCallback(() => {
    if (!current || phase !== "pick") return;
    resultsRef.current = [...resultsRef.current, { questionId: current.id, action: "skip" }];
    setStreak(0);
    goNext();
  }, [current, phase, goNext]);

  // Keyboard: 1-4 / A-D to answer, Enter or → for next, S to skip.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (phase === "pick") {
        const k = e.key.toUpperCase();
        const idx = ["1", "2", "3", "4"].includes(k) ? Number(k) - 1 : LETTERS.indexOf(k);
        if (idx >= 0 && options[idx]) {
          e.preventDefault();
          onPick(options[idx]);
        } else if (k === "S") {
          onSkip();
        }
      } else if (e.key === "Enter" || e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, options, onPick, onSkip, goNext]);

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
  const pickedCorrect = pickedKey ? options.find((o) => o.key === pickedKey)?.isCorrect : false;
  const firmTags = current.tags.filter((t) => t.startsWith("firm:")).map((t) => t.slice(5));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-400">
        <span>
          Question {index + 1} of {questions.length}
        </span>
        <div className="flex items-center gap-3 font-mono text-xs">
          <span title="Correct so far" className="text-emerald-300">
            ✓ {correctCount}/{Math.max(1, answered)}
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
            {firmTags.slice(0, 3).map((f) => (
              <span key={f} className="rounded bg-[#4a6fa5]/20 px-1.5 py-0.5 normal-case tracking-normal text-[#a8c0e6]">
                {f}
              </span>
            ))}
          </div>
          <p className="text-base font-medium leading-relaxed text-zinc-100 [overflow-wrap:anywhere] sm:text-lg">
            {drill?.stem ?? current.question}
          </p>
        </div>

        {waitingForChoices ? (
          <div className="space-y-3" aria-busy="true">
            <p className="text-center text-xs text-zinc-500">Building answer choices…</p>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-zinc-900" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {options.map((opt, i) => {
              const isPicked = pickedKey === opt.key;
              const showCorrect = phase === "show" && opt.isCorrect;
              const showWrong = phase === "show" && isPicked && !opt.isCorrect;
              return (
                <button
                  key={opt.key}
                  type="button"
                  disabled={phase === "show"}
                  onClick={() => onPick(opt)}
                  className={cn(
                    MCQ_CHOICE_BUTTON_CLASS,
                    "flex items-start gap-3 transition-all duration-200",
                    phase === "pick" &&
                      "border-white/10 bg-zinc-950/90 hover:border-[#4a6fa5]/50 hover:bg-zinc-900/95 hover:shadow-[0_0_20px_-8px_rgba(74,111,165,0.3)]",
                    showCorrect && "animate-df-flash-green border-emerald-500/70 bg-emerald-950/50 text-emerald-50",
                    showWrong && "animate-df-shake border-red-500/80 bg-red-950/50 text-red-50",
                    phase === "show" && !showCorrect && !showWrong && "border-white/[0.06] opacity-50",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold",
                      showCorrect
                        ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                        : showWrong
                          ? "border-red-400 bg-red-500/20 text-red-200"
                          : "border-zinc-600 text-zinc-400",
                    )}
                  >
                    {LETTERS[i]}
                  </span>
                  <span className="min-w-0 flex-1">{opt.text}</span>
                </button>
              );
            })}
          </div>
        )}

        {phase === "show" ? (
          <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-4 text-sm shadow-inner">
            <p className="mb-2 text-sm font-semibold">
              {pickedCorrect ? (
                <span className="text-emerald-400">{persistEachAnswer ? "Correct · +10 XP" : "Correct"}</span>
              ) : (
                <span className="text-red-400">{persistEachAnswer ? "Incorrect · +0 XP" : "Incorrect"}</span>
              )}
            </p>
            {drill?.why ? (
              <p className="mb-3 rounded-lg border border-amber-500/20 bg-amber-950/20 px-3 py-2 text-amber-100/90">
                <span className="font-semibold">The trap: </span>
                {drill.why}
              </p>
            ) : null}
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Full answer</p>
            <p className="whitespace-pre-wrap leading-relaxed text-zinc-200">{current.answer}</p>
            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="hidden text-xs text-zinc-500 sm:inline">Press Enter for next</span>
              <Button type="button" onClick={goNext} autoFocus>
                {index + 1 >= questions.length ? "Finish" : "Next question →"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="hidden text-xs text-zinc-600 sm:inline">Keys: 1–4 or A–D to answer · S to skip</span>
            <Button type="button" variant="ghost" size="sm" onClick={onSkip} disabled={waitingForChoices}>
              Skip
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
