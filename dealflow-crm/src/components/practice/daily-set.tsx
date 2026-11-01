"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/stat-tile";
import { QuestionMcqDeck } from "@/components/question-mcq-deck";
import type { PublicMcq } from "@/lib/mcq/types";

type DrillState = {
  completed: boolean;
  questions: PublicMcq[];
  total: number;
  drillStreak: number;
  log: { xpEarned: number; correct: number; questionsAnswered: number } | null;
};
type Summary = { xpEarned: number; drillStreak: number; correct: number; answered: number; total: number };

const daysText = (n: number) => (n > 0 ? `Active ${n} day${n === 1 ? "" : "s"} in a row` : "Start a run today");

export function DailySet({ initialStreak }: { initialStreak: number }) {
  const router = useRouter();
  const [state, setState] = useState<DrillState | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/questions/daily-drill", { method: "POST" });
      const d = (await res.json()) as Partial<DrillState>;
      setState({
        completed: Boolean(d.completed),
        questions: d.questions ?? [],
        total: d.total ?? 5,
        drillStreak: d.drillStreak ?? initialStreak,
        log: d.log ?? null,
      });
    } catch {
      toast.error("Couldn't load today's set.");
    }
  }, [initialStreak]);

  useEffect(() => {
    void load();
  }, [load]);

  // The server scores the set from the graded answers; the browser only says it's done.
  const finish = async () => {
    const res = await fetch("/api/questions/drill-complete", { method: "POST" });
    const d = (await res.json().catch(() => ({}))) as Partial<Summary> & { error?: string };
    if (!res.ok) {
      toast.error(d.error ?? "Couldn't finish the set.");
      void load();
      return;
    }
    setSummary(d as Summary);
    toast("Daily set complete");
    router.refresh();
  };

  if (!state) {
    return (
      <Card className="max-w-[820px] space-y-3 p-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </Card>
    );
  }

  const done = summary ?? (state.completed && state.log
    ? { xpEarned: state.log.xpEarned, correct: state.log.correct, answered: state.log.questionsAnswered, total: state.log.questionsAnswered, drillStreak: state.drillStreak }
    : null);

  if (done) {
    return (
      <Card className="max-w-[820px] p-6">
        <p className="eyebrow">Today</p>
        <h2 className="mt-1 text-lg font-semibold text-ink">Daily set complete</h2>
        <div className="mt-5 grid grid-cols-3 gap-4">
          <StatTile value={`${done.correct}/${done.total}`} label="correct" />
          <StatTile value={`+${done.xpEarned}`} label="points" />
          <StatTile value={done.drillStreak} label="days in a row" />
        </div>
        <p className="mt-5 text-sm text-ink-2">A new set is ready tomorrow. Anything you missed comes back for review.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="primary" asChild>
            <Link href="/practice">Keep practicing</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/dashboard">Back to Home</Link>
          </Button>
        </div>
      </Card>
    );
  }

  if (!state.questions.length) {
    // Every question answered but not closed out (e.g. the tab was closed on the last one).
    return (
      <Card className="max-w-[820px] p-6">
        <p className="text-sm text-ink-2">You&apos;ve answered today&apos;s questions.</p>
        <Button variant="primary" className="mt-4" onClick={() => void finish()}>
          See results
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-ink-3">{daysText(state.drillStreak)}</p>
      <QuestionMcqDeck
        questions={state.questions}
        context="drill"
        startNumber={state.total - state.questions.length}
        total={state.total}
        finishLabel="See results"
        onComplete={() => void finish()}
      />
    </div>
  );
}
