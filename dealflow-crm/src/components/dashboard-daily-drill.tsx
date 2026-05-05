"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { QuestionMcqDeck } from "@/components/question-mcq-deck";
import type { McqDistractorSource } from "@/lib/question-mcq";
import { gradeAnswerByKeywords, type KeywordGradeResult } from "@/lib/answer-grader";
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
  keywords: string[];
};

type Action = "known" | "partial" | "review" | "skip";

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
  const [sessionFormat, setSessionFormat] = useState<QuestionPracticeMode>("mcq");
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [gradedResult, setGradedResult] = useState<KeywordGradeResult | null>(null);
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
    setTypedAnswer("");
    setGradedResult(null);
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
      colors: ["#f5f5f5", "#c9a84c", "#4a6fa5"],
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
      setTypedAnswer("");
      setGradedResult(null);
    }
  };

  const onFlashcardFlip = () => {
    if (!current) return;
    setFlipped((prev) => {
      const next = !prev;
      if (next && typedAnswer.trim()) {
        setGradedResult(
          gradeAnswerByKeywords({
            userAnswer: typedAnswer,
            modelAnswer: current.answer,
            keywords: current.keywords,
          }),
        );
      } else if (!next) {
        setGradedResult(null);
      }
      return next;
    });
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
      <Card className="border-l-2 border-l-[#f5f5f5] p-4">
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
            <p className="mt-2 text-[#c9a84c]">🔥 Streak: {summary.drillStreak} days</p>
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
                className="relative w-full cursor-pointer border-0 bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a6fa5]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
                onClick={onFlashcardFlip}
              >
                <div className={cn("flip-card-inner shadow-xl", flipped && "is-flipped")}>
                  <div className="flip-card-face border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950">
                    <p className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">Question</p>
                    <p className="text-lg font-medium text-zinc-100">{current.question}</p>
                    <div className="mt-5">
                      <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-zinc-500">
                        Type your answer (optional)
                      </label>
                      <textarea
                        className="min-h-24 w-full rounded border border-[#2a2a2a] bg-[#111111] px-3 py-2 text-sm text-[#f0f0f0] outline-none focus:border-[#3a3a3a] focus:ring-1 focus:ring-[#4a6fa5]/40"
                        placeholder="Write your answer before flipping..."
                        value={typedAnswer}
                        onChange={(e) => setTypedAnswer(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <p className="mt-6 text-xs text-zinc-500">Tap to flip · reveal answer</p>
                  </div>
                  <div className="flip-card-face flip-card-back border border-[#2a2a2a] bg-[#141414]">
                    <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[#888888]">Answer</p>
                    <p className="text-base text-zinc-100">{current.answer}</p>
                  </div>
                </div>
              </button>
            </div>
            <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
              {flipped && gradedResult ? (
                <>
                  <div className="w-full rounded border border-[#2a2a2a] bg-[#161616] p-3 text-sm text-[#e8e8e8]">
                    <p className="font-medium text-[#f0f0f0]">
                      {gradedResult.grade === "correct"
                        ? "Correct (+10 XP)"
                        : gradedResult.grade === "partial"
                          ? "Partial (+5 XP)"
                          : "Incorrect (+0 XP)"}{" "}
                      ({Math.round(gradedResult.hitRate * 100)}% keyword hit)
                    </p>
                    <p className="mt-1 text-xs text-[#888888]">
                      {gradedResult.foundKeywords.length > 0
                        ? `✓ mentioned ${gradedResult.foundKeywords.join(", ")}`
                        : "✓ mentioned: none"}
                    </p>
                    <p className="text-xs text-[#888888]">
                      {gradedResult.missedKeywords.length > 0
                        ? `✗ missed: ${gradedResult.missedKeywords.join(", ")}`
                        : "✗ missed: none"}
                    </p>
                  </div>
                  <Button onClick={() => void onAction(gradedResult.suggestedAction)}>Continue</Button>
                  <Button variant="ghost" onClick={() => void onAction("skip")}>
                    Skip
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => void onAction("known")}>Got it</Button>
                  <Button variant="outline" onClick={() => void onAction("review")}>
                    Need Review
                  </Button>
                  <Button variant="ghost" onClick={() => void onAction("skip")}>
                    Skip
                  </Button>
                </>
              )}
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
      <Card className="border border-[#2a2a2a] border-l-2 border-l-[#c9a84c] bg-[#161616] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#666666]">Daily drill</p>
            <p className="mt-1 text-lg font-semibold text-[#f0f0f0]">Come back tomorrow</p>
            <p className="mt-2 text-2xl">
              <span className="text-[#c9a84c]">🔥</span>{" "}
              <span className="font-mono text-[#f0f0f0]">{streak}</span>
              <span className="text-sm text-[#888888]"> day streak</span>
            </p>
            {log ? (
              <p className="mt-2 text-xs text-[#888888]">
                Today: +{log.xpEarned} XP · {log.correct}/{log.questionsAnswered} correct
              </p>
            ) : null}
          </div>
          <div className="min-w-[140px] flex-1">
            <p className="text-xs text-[#888888]">Weekly XP</p>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#1a1a1a] ring-1 ring-[#2a2a2a]">
              <div
                className="h-full bg-[#4a6fa5] transition-[width] duration-500 ease-out"
                style={{ width: `${weeklyPct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-[#888888]">
              {weeklyXP} / {weeklyGoal}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border border-[#2a2a2a] border-l-2 border-l-[#f5f5f5] bg-[#161616] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-label">Daily drill</p>
          <p className="mt-1 text-lg font-semibold text-[#f0f0f0]">5 questions · weak categories first</p>
          <p className="mt-2 text-2xl">
            <span className="text-[#c9a84c]">🔥</span>{" "}
            <span className="font-mono text-[#f0f0f0]">{streak}</span>
            <span className="text-sm text-[#888888]"> day streak</span>
          </p>
          <p className="mt-1 text-xs text-[#888888]">
            MCQ is default and auto-graded. Study Mode (flashcard) supports optional typed answers with keyword
            grading: Correct +10 XP, Partial +5 XP, Incorrect +0 XP.
          </p>
        </div>
        <div className="min-w-[160px] flex-1 space-y-2">
          <p className="text-xs text-[#888888]">Weekly XP</p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#1a1a1a] ring-1 ring-[#2a2a2a]">
            <div
              className="h-full bg-[#4a6fa5] transition-[width] duration-500 ease-out"
              style={{ width: `${weeklyPct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-[#888888]">
            {weeklyXP} / {weeklyGoal}
          </p>
          <Button
            className="animate-df-pulse-glow w-full"
            size="sm"
            variant="cta"
            onClick={() => beginSession("mcq")}
          >
            Start MCQ drill
          </Button>
          <Button
            className="animate-df-pulse-glow w-full"
            size="sm"
            variant="cta"
            onClick={() => beginSession("flashcard")}
          >
            Study Mode (flashcard)
          </Button>
        </div>
      </div>
    </Card>
  );
}
