"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QuestionMcqDeck } from "@/components/question-mcq-deck";
import type { PublicMcq } from "@/lib/mcq/types";

type CompleteResponse = {
  xpEarned: number;
  drillStreak: number;
  weeklyXP: number;
  xp: number;
  milestoneStreak: number | null;
  correct: number;
  answered: number;
  total: number;
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
  const [questions, setQuestions] = useState<PublicMcq[]>([]);
  const [total, setTotal] = useState(5);
  const [streak, setStreak] = useState(initialStreak);
  const [weeklyXP, setWeeklyXP] = useState(initialWeeklyXp);
  const [log, setLog] = useState<{
    xpEarned: number;
    correct: number;
    questionsAnswered: number;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<CompleteResponse | null>(null);

  const refreshState = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/questions/daily-drill", { method: "POST" });
      const data = (await res.json()) as {
        completed?: boolean;
        questions?: PublicMcq[];
        total?: number;
        drillStreak?: number;
        xp?: number;
        weeklyXP?: number;
        log?: { xpEarned: number; correct: number; questionsAnswered: number };
      };
      setCompleted(Boolean(data.completed));
      setQuestions(data.questions ?? []);
      setTotal(data.total ?? 5);
      setStreak(data.drillStreak ?? initialStreak);
      setWeeklyXP(data.weeklyXP ?? initialWeeklyXp);
      setLog(data.log ?? null);
    } catch {
      /* keep defaults */
    }
    setLoading(false);
  }, [initialStreak, initialWeeklyXp]);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  const beginSession = () => {
    if (!questions.length) return;
    setSummary(null);
    setOpen(true);
  };

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

  // Score is computed on the server from the graded attempts — the client only says "I'm done".
  const finish = async () => {
    const res = await fetch("/api/questions/drill-complete", {
      method: "POST",
    });
    if (res.ok) {
      const data = (await res.json()) as CompleteResponse;
      setSummary(data);
      setStreak(data.drillStreak);
      setWeeklyXP(data.weeklyXP);
      setCompleted(true);
      void fireConfetti(data.milestoneStreak);
      router.refresh();
    } else {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(err.error ?? "Couldn't finish the drill");
      setOpen(false);
      void refreshState();
    }
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
          </div>
        </div>
      </Card>
    );
  }

  if (open) {
    return (
      <div className="fixed inset-0 z-[90] flex flex-col bg-zinc-950/98 p-4 text-zinc-100 backdrop-blur">
        {summary ? (
          <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-semibold">Drill complete</h2>
            <p className="mt-4 text-lg text-zinc-200">
              Score {summary.correct}/{summary.total}
            </p>
            <p className="mt-1 text-sm text-zinc-500">+{summary.xpEarned} XP</p>
            <p className="mt-2 text-[#c9a84c]">
              🔥 Streak: {summary.drillStreak} days
            </p>
            {summary.milestoneStreak ? (
              <p className="mt-2 text-amber-300">
                {summary.milestoneStreak}-day milestone
              </p>
            ) : null}
            <div className="mt-8 flex gap-2">
              <Button
                onClick={() => {
                  setOpen(false);
                  void refreshState();
                }}
              >
                Close
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/practice")}
              >
                Keep practicing
              </Button>
            </div>
          </div>
        ) : (
          <QuestionMcqDeck
            questions={questions}
            context="drill"
            finishLabel="Finish drill"
            onComplete={() => void finish()}
            onExit={() => {
              setOpen(false);
              void refreshState();
            }}
          />
        )}
      </div>
    );
  }

  if (completed) {
    return (
      <Card className="border border-[#2a2a2a] border-l-2 border-l-[#c9a84c] bg-[#161616] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#666666]">
              Daily drill
            </p>
            <p className="mt-1 text-lg font-semibold text-[#f0f0f0]">
              Come back tomorrow
            </p>
            <p className="mt-2 text-2xl">
              <span className="text-[#c9a84c]">🔥</span>{" "}
              <span className="font-mono text-[#f0f0f0]">{streak}</span>
              <span className="text-sm text-[#888888]"> day streak</span>
            </p>
            {log ? (
              <p className="mt-2 text-xs text-[#888888]">
                Today: +{log.xpEarned} XP · {log.correct}/
                {log.questionsAnswered} correct
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
          <p className="mt-1 text-lg font-semibold text-[#f0f0f0]">
            {total} questions · reviews + your weakest lessons
          </p>
          <p className="mt-2 text-2xl">
            <span className="text-[#c9a84c]">🔥</span>{" "}
            <span className="font-mono text-[#f0f0f0]">{streak}</span>
            <span className="text-sm text-[#888888]"> day streak</span>
          </p>
          <p className="mt-1 text-xs text-[#888888]">
            Missed questions come back after 1, 3 and 7 days. +10 XP per correct
            answer.{" "}
            <Link href="/practice" className="text-[#a8c0e6] hover:underline">
              Free practice →
            </Link>
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
            disabled={!questions.length}
            onClick={beginSession}
          >
            {questions.length < total
              ? `Resume drill (${questions.length} left)`
              : "Start daily drill"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
