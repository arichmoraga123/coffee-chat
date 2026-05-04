"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  const [streak, setStreak] = useState(initialStreak);
  const [xp, setXp] = useState(initialXp);
  const [weeklyXP, setWeeklyXP] = useState(initialWeeklyXp);
  const [log, setLog] = useState<{ xpEarned: number; correct: number; questionsAnswered: number } | null>(null);

  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<{ questionId: string; action: Action }[]>([]);
  const [end, setEnd] = useState(false);
  const [summary, setSummary] = useState<{
    xpEarned: number;
    drillStreak: number;
    weeklyXP: number;
    milestoneStreak: number | null;
  } | null>(null);

  const refreshState = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/questions/daily-drill", { method: "POST" });
    const data = (await res.json()) as {
      completed?: boolean;
      questions?: Q[];
      drillStreak?: number;
      xp?: number;
      weeklyXP?: number;
      log?: { xpEarned: number; correct: number; questionsAnswered: number };
    };
    setCompleted(Boolean(data.completed));
    setQuestions(data.questions ?? []);
    setStreak(data.drillStreak ?? initialStreak);
    setXp(data.xp ?? initialXp);
    setWeeklyXP(data.weeklyXP ?? initialWeeklyXp);
    setLog(data.log ?? null);
    setLoading(false);
  }, [initialStreak, initialXp, initialWeeklyXp]);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  const start = () => {
    if (!questions.length) return;
    setOpen(true);
    setIdx(0);
    setFlipped(false);
    setResults([]);
    setEnd(false);
    setSummary(null);
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
        body: JSON.stringify({ results: next }),
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

  const weeklyGoal = 500;
  const weeklyPct = Math.min(100, Math.round((weeklyXP / weeklyGoal) * 100));

  if (loading) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/80 p-4">
        <p className="text-sm text-zinc-400">Loading daily drill…</p>
      </Card>
    );
  }

  if (open) {
    return (
      <div className="fixed inset-0 z-[90] flex flex-col bg-zinc-950/98 p-4 text-zinc-100 backdrop-blur">
        {end && summary ? (
          <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-semibold">Drill complete</h2>
            <p className="mt-4 text-zinc-400">+{summary.xpEarned} XP today</p>
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
            <button
              type="button"
              className={cn(
                "mx-auto flex min-h-[50vh] w-full max-w-3xl flex-1 flex-col items-center justify-center rounded-xl border p-8 text-left shadow-xl",
                flipped ? "border-emerald-900/40 bg-emerald-950/20" : "border-zinc-700 bg-zinc-900",
              )}
              onClick={() => setFlipped((f) => !f)}
            >
              {!flipped ? (
                <>
                  <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Question</p>
                  <p className="text-lg font-medium">{current.question}</p>
                  <p className="mt-6 text-xs text-zinc-500">Tap to reveal answer</p>
                </>
              ) : (
                <>
                  <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Answer</p>
                  <p className="text-base text-zinc-200">{current.answer}</p>
                </>
              )}
            </button>
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
      <Card className="border border-amber-900/40 bg-gradient-to-br from-zinc-900 to-zinc-950 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/90">Daily drill</p>
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
            <div className="mt-1 h-2 overflow-hidden rounded bg-zinc-800">
              <div className="h-full bg-cyan-500 transition-all" style={{ width: `${weeklyPct}%` }} />
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
    <Card className="border border-cyan-900/30 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300/90">Daily drill</p>
          <p className="mt-1 text-lg font-semibold text-zinc-100">5 cards · weak categories first</p>
          <p className="mt-2 text-2xl">
            <span className="text-orange-400">🔥</span>{" "}
            <span className="font-mono text-zinc-100">{streak}</span>
            <span className="text-sm text-zinc-500"> day streak</span>
          </p>
          <p className="mt-1 text-xs text-zinc-500">Got it +10 XP · Need review +2 XP · Skip 0 XP</p>
        </div>
        <div className="min-w-[160px] flex-1">
          <p className="text-xs text-zinc-500">Weekly XP</p>
          <div className="mt-1 h-2 overflow-hidden rounded bg-zinc-800">
            <div className="h-full bg-cyan-500 transition-all" style={{ width: `${weeklyPct}%` }} />
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {weeklyXP} / {weeklyGoal}
          </p>
          <Button className="mt-3 w-full" size="sm" onClick={start}>
            Start Today&apos;s Drill
          </Button>
        </div>
      </div>
    </Card>
  );
}
