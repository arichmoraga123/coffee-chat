"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { QuestionMcqDeck } from "@/components/question-mcq-deck";
import type { McqDistractorSource } from "@/lib/question-mcq";
import {
  readStoredQuestionMode,
  writeStoredQuestionMode,
  type QuestionPracticeMode,
} from "@/lib/question-mode-storage";

type Q = {
  id: string;
  question: string;
  answer: string;
  category: string;
  subcategory: string | null;
  difficulty: string;
  tags: string[];
};

type Action = "known" | "review" | "skip";

type CompleteResponse = {
  xpEarned: number;
  drillStreak: number;
  weeklyXP: number;
  xp: number;
  milestoneStreak: number | null;
  correct?: number;
  answered?: number;
};

export function DashboardDailyDrill({
  initialStreak,
  initialXp,
  initialWeeklyXp,
}: {
  initialStreak: number;
  initialXp: number;
  initialWeeklyXp: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [mcqPool, setMcqPool] = useState<McqDistractorSource[]>([]);
  const [streak, setStreak] = useState(initialStreak);
  const [xp, setXp] = useState(initialXp);
  const [weeklyXP, setWeeklyXP] = useState(initialWeeklyXp);
  const [log, setLog] = useState<{ xpEarned: number; correct: number; questionsAnswered: number } | null>(null);

  const [open, setOpen] = useState(false);
  const [sessionFormat, setSessionFormat] = useState<QuestionPracticeMode>("flashcard");
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<{ questionId: string; action: Action }[]>([]);
  const [end, setEnd] = useState(false);
  const [summary, setSummary] = useState<CompleteResponse | null>(null);
  const [mcqExtras, setMcqExtras] = useState<{ score: number; total: number; ms: number } | null>(null);
  const sessionStartRef = useRef<number | null>(null);

  const refreshState = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/questions/daily-drill", { method: "POST" });
    const data = (await res.json()) as {
      completed?: boolean;
      questions?: Q[];
      mcqPool?: McqDistractorSource[];
      drillStreak?: number;
      xp?: number;
      weeklyXP?: number;
      log?: { xpEarned: number; correct: number; questionsAnswered: number };
    };
    setCompleted(Boolean(data.completed));
    setQuestions(data.questions ?? []);
    setMcqPool(data.mcqPool ?? []);
    setStreak(data.drillStreak ?? initialStreak);
    setXp(data.xp ?? initialXp);
    setWeeklyXP(data.weeklyXP ?? initialWeeklyXp);
    setLog(data.log ?? null);
    setLoading(false);
  }, [initialStreak, initialXp, initialWeeklyXp]);

  useEffect(() => {
    setSessionFormat(readStoredQuestionMode());
  }, []);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  const persistPreferredMode = (mode: QuestionPracticeMode) => {
    setSessionFormat(mode);
    writeStoredQuestionMode(mode);
  };

  const beginSession = (format: QuestionPracticeMode) => {
    if (!questions.length) return;
    persistPreferredMode(format);
    setSessionFormat(format);
    setOpen(true);
    setIdx(0);
    setFlipped(false);
    setResults([]);
    setEnd(false);
    setSummary(null);
    setMcqExtras(null);
    sessionStartRef.current = Date.now();
  };

  const current = questions[idx];

  const fireConfetti = async (milestone: number | null) => {
    if (!milestone) return;
    const mod = await import("canvas-confetti");
    mod.default({
      particleCount: 140,
      spread: 70,
      origin: { y: 0.35 },
      colors: ["#22d3ee", "#fbbf24", "#a78bfa"],
    });
  };

  const onAction = async (action: Action) => {
    if (!current) return;
    const next = [...results, { questionId: current.id, action }];
    setResults(next);
    const last = idx + 1 >= questions.length;
    if (last) {
      const res = await fetch("/api/questions/drill-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: next, format: "flashcard" }),
      });
      if (res.ok) {
        const data = (await res.json()) as CompleteResponse;
        setSummary(data);
        setStreak(data.drillStreak);
        setXp(data.xp);
        setWeeklyXP(data.weeklyXP);
        void fireConfetti(data.milestoneStreak);
      }
      setEnd(true);
      setCompleted(true);
      router.refresh();
    } else {
      setIdx((i) => i + 1);
      setFlipped(false);
    }
  };

  const onMcqComplete = async (mcqResults: { questionId: string; action: Action }[]) => {
    const started = sessionStartRef.current ?? Date.now();
    const score = mcqResults.filter((r) => r.action === "known").length;
    const res = await fetch("/api/questions/drill-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: mcqResults, format: "mcq" }),
    });
    if (res.ok) {
      const data = (await res.json()) as CompleteResponse;
      setSummary(data);
      setStreak(data.drillStreak);
      setXp(data.xp);
      setWeeklyXP(data.weeklyXP);
      void fireConfetti(data.milestoneStreak);
      setMcqExtras({
        score,
        total: questions.length,
        ms: Date.now() - started,
      });
    }
    setEnd(true);
    setCompleted(true);
    router.refresh();
  };

  const weeklyGoal = 500;
  const weeklyPct = Math.min(100, Math.round((weeklyXP / weeklyGoal) * 100));

  if (loading) {
    return (
      <Card className="border-l-4 border-cyan-500/50 p-4">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-5 w-64 max-w-full" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 flex-1" />
          </div>
        </div>
      </Card>
    );
  }

  if (open) {
    return (
      <div className="fixed inset-0 z-[90] flex flex-col bg-zinc-950/98 p-4 text-zinc-100 backdrop-blur">
        {end && summary ? (
          <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-semibold">Drill complete</h2>
            {mcqExtras ? (
              <>
                <p className="mt-4 text-lg text-zinc-200">
                  Score {mcqExtras.score}/{mcqExtras.total}
                </p>
                <p className="mt-1 text-sm text-zinc-500">
                  Time {(mcqExtras.ms / 1000).toFixed(1)}s · +{summary.xpEarned} XP
                </p>
              </>
            ) : (
              <p className="mt-4 text-zinc-400">+{summary.xpEarned} XP today</p>
            )}
            <p className="mt-2 text-cyan-400">🔥 Streak: {summary.drillStreak} days</p>
            {summary.milestoneStreak ? (
              <p className="mt-2 text-amber-300">{summary.milestoneStreak}-day milestone</p>
            ) : null}
            <Button
              className="mt-8"
              onClick={() => {
                setOpen(false);
                void refreshState();
              }}
            >
              Close
            </Button>
          </div>
        ) : sessionFormat === "mcq" && questions.length ? (
          <QuestionMcqDeck
            questions={questions}
            distractorPool={mcqPool.length ? mcqPool : questions}
            persistEachAnswer={false}
            onComplete={(r) => void onMcqComplete(r)}
            onExit={() => setOpen(false)}
          />
        ) : current ? (
          <>
            <div className="mb-4 flex items-center justify-between text-sm text-zinc-400">
              <span>
                Card {idx + 1} / {questions.length}
              </span>
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
                Exit
              </Button>
            </div>
            <div className="perspective-flip mx-auto w-full max-w-3xl flex-1">
              <button
                type="button"
                className="relative w-full cursor-pointer border-0 bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                onClick={() => setFlipped((f) => !f)}
              >
                <div className={cn("flip-card-inner shadow-xl", flipped && "is-flipped")}>
                  <div className="flip-card-face border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950">
                    <p className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">Question</p>
                    <p className="text-lg font-medium text-zinc-100">{current.question}</p>
                    <p className="mt-6 text-xs text-zinc-500">Tap to flip · reveal answer</p>
                  </div>
                  <div className="flip-card-face flip-card-back border border-emerald-500/25 bg-gradient-to-br from-emerald-950/40 to-zinc-950">
                    <p className="mb-2 text-xs uppercase tracking-[0.18em] text-emerald-400/90">Answer</p>
                    <p className="text-base text-zinc-100">{current.answer}</p>
                  </div>
                </div>
              </button>
            </div>
            <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
              <Button onClick={() => void onAction("known")}>Got it</Button>
              <Button variant="outline" onClick={() => void onAction("review")}>
                Need Review
              </Button>
              <Button variant="ghost" onClick={() => void onAction("skip")}>
                Skip
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm text-zinc-400">
            <p>No drill cards available yet.</p>
            <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (completed) {
    return (
      <Card className="border border-amber-500/20 bg-gradient-to-br from-amber-950/30 via-zinc-900 to-zinc-950 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300/90">Daily drill</p>
            <p className="mt-1 text-lg font-semibold text-zinc-100">Come back tomorrow</p>
            <p className="mt-2 text-2xl">
              <span className="text-orange-400">🔥</span>{" "}
              <span className="font-mono text-zinc-100">{streak}</span>
              <span className="text-sm text-zinc-500"> day streak</span>
            </p>
            {log ? (
              <p className="mt-2 text-xs text-zinc-500">
                Today: +{log.xpEarned} XP · {log.correct}/{log.questionsAnswered} correct
              </p>
            ) : null}
          </div>
          <div className="min-w-[140px] flex-1">
            <p className="text-xs text-zinc-500">Weekly XP</p>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-800/90 ring-1 ring-white/5">
              <div
                className="h-full bg-gradient-to-r from-cyan-700 via-teal-400 to-cyan-300 transition-[width] duration-500 ease-out"
                style={{ width: `${weeklyPct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              {weeklyXP} / {weeklyGoal}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-cyan-400/90 bg-gradient-to-br from-zinc-900/95 via-zinc-950 to-black p-4 shadow-[4px_0_24px_-8px_rgba(0,188,212,0.35)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-label">Daily drill</p>
          <p className="mt-1 text-lg font-semibold text-zinc-100">5 questions · weak categories first</p>
          <p className="mt-2 text-2xl">
            <span className="text-orange-400">🔥</span>{" "}
            <span className="font-mono text-zinc-100">{streak}</span>
            <span className="text-sm text-zinc-500"> day streak</span>
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Flashcard: Got it +10 XP · Need review +2 XP · Skip 0 XP. MCQ: correct +10 XP, wrong +0 XP.
          </p>
        </div>
        <div className="min-w-[160px] flex-1 space-y-2">
          <p className="text-xs text-zinc-500">Weekly XP</p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-800/90 ring-1 ring-white/5">
            <div
              className="h-full bg-gradient-to-r from-cyan-700 via-teal-400 to-cyan-300 transition-[width] duration-500 ease-out"
              style={{ width: `${weeklyPct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {weeklyXP} / {weeklyGoal}
          </p>
          <Button
            className="animate-df-pulse-glow w-full"
            size="sm"
            variant="cta"
            onClick={() => beginSession("flashcard")}
          >
            Flashcard drill
          </Button>
          <Button
            className="animate-df-pulse-glow w-full"
            size="sm"
            variant="cta"
            onClick={() => beginSession("mcq")}
          >
            MCQ drill
          </Button>
        </div>
      </div>
    </Card>
  );
}
