"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { buildMcqOptions, type McqDistractorSource, type McqOption } from "@/lib/question-mcq";
import { cn } from "@/lib/utils";

export type QuestionMcqRow = {
  id: string;
  question: string;
  answer: string;
  category: string;
  subcategory: string | null;
  difficulty: string;
  tags: string[];
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
  const resultsRef = useRef<DrillResult[]>([]);

  const current = questions[index];

  const options = useMemo(() => {
    if (!current) return [];
    return buildMcqOptions(current, distractorPool.length ? distractorPool : [current]);
  }, [current, distractorPool]);

  useEffect(() => {
    setPhase("pick");
    setPickedKey(null);
  }, [index]);

  const patchProgress = useCallback(async (questionId: string, correct: boolean) => {
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
  }, [persistEachAnswer]);

  const advanceAfter = useCallback(
    (correct: boolean) => {
      if (!current) return;
      const action: DrillResult["action"] = correct ? "known" : "review";
      resultsRef.current = [...resultsRef.current, { questionId: current.id, action }];
      if (persistEachAnswer) void patchProgress(current.id, correct);

      const delay = correct ? 1500 : 2500;
      const nextIndex = index + 1;
      const isLast = nextIndex >= questions.length;
      window.setTimeout(() => {
        if (isLast) {
          onComplete(resultsRef.current);
        } else {
          setIndex(nextIndex);
        }
      }, delay);
    },
    [current, index, questions.length, onComplete, patchProgress, persistEachAnswer],
  );

  const onPick = (opt: McqOption) => {
    if (phase !== "pick") return;
    setPhase("show");
    setPickedKey(opt.key);
    advanceAfter(opt.isCorrect);
  };

  const onSkip = () => {
    if (!current) return;
    resultsRef.current = [...resultsRef.current, { questionId: current.id, action: "skip" }];
    const last = index + 1 >= questions.length;
    if (last) {
      onComplete(resultsRef.current);
    } else {
      setIndex((i) => i + 1);
    }
  };

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

  const pct = Math.round(((index + (phase === "show" ? 0.5 : 0)) / questions.length) * 100);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between gap-2 text-sm text-zinc-400">
        <span>
          Question {index + 1} of {questions.length}
        </span>
        <Button size="sm" variant="outline" type="button" onClick={onExit}>
          Exit
        </Button>
      </div>
      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full bg-cyan-600 transition-all" style={{ width: `${pct}%` }} />
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 overflow-y-auto">
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 p-6">
          <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Question</p>
          <p className="text-base font-medium text-zinc-100">{current.question}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((opt) => {
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
                  "rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                  phase === "pick" && "border-zinc-600 bg-zinc-950 hover:border-cyan-700 hover:bg-zinc-900",
                  showCorrect && "border-emerald-600 bg-emerald-950/40 text-emerald-100",
                  showWrong && "border-red-600 bg-red-950/40 text-red-100",
                  phase === "show" && !showCorrect && !showWrong && "border-zinc-800 opacity-50",
                )}
              >
                {opt.text}
              </button>
            );
          })}
        </div>

        {phase === "show" ? (
          <div className="rounded-lg border border-zinc-700 bg-zinc-900/60 p-4 text-sm">
            <p className="mb-2 text-xs font-semibold uppercase text-zinc-500">Explanation</p>
            {pickedKey ? (
              <p className="mb-2 text-xs font-medium">
                {options.find((o) => o.key === pickedKey)?.isCorrect ? (
                  <span className="text-emerald-400">
                    {persistEachAnswer ? "Correct · +10 XP" : "Correct"}
                  </span>
                ) : (
                  <span className="text-red-400">
                    {persistEachAnswer ? "Incorrect · +0 XP" : "Incorrect"}
                  </span>
                )}
              </p>
            ) : null}
            <p className="whitespace-pre-wrap text-zinc-200">{current.answer}</p>
          </div>
        ) : null}

        <div className="flex justify-center">
          <Button type="button" variant="ghost" size="sm" onClick={onSkip} disabled={phase === "show"}>
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
}
