"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type QuestionDTO = {
  id: string;
  question: string;
  answer: string;
  category: string;
  subcategory: string | null;
  difficulty: string;
  tags: string[];
};

type ProgressMap = Record<string, "known" | "review" | "unseen">;

const TARGET_TOTAL = 400;

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function QuestionsBank({
  questions,
  initialProgress,
  drillStreak,
  weeklyXP = 0,
  totalXP = 0,
}: {
  questions: QuestionDTO[];
  initialProgress: ProgressMap;
  drillStreak: number;
  weeklyXP?: number;
  totalXP?: number;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressMap>(initialProgress);
  const [category, setCategory] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [drillOpen, setDrillOpen] = useState(false);
  const [drillCategory, setDrillCategory] = useState("all");
  const [drillDifficulty, setDrillDifficulty] = useState("all");
  const [shuffle, setShuffle] = useState(true);
  const [drillQueue, setDrillQueue] = useState<QuestionDTO[]>([]);
  const [drillIndex, setDrillIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionKnown, setSessionKnown] = useState(0);
  const [sessionReview, setSessionReview] = useState(0);
  const [sessionSkipped, setSessionSkipped] = useState(0);
  const [endScreen, setEndScreen] = useState(false);
  const [streakDisplay, setStreakDisplay] = useState(drillStreak);

  const categories = useMemo(() => {
    const s = new Set(questions.map((q) => q.category));
    return ["all", ...Array.from(s).sort()];
  }, [questions]);

  const statusOf = useCallback(
    (id: string) => progress[id] ?? "unseen",
    [progress],
  );

  const filteredBrowse = useMemo(() => {
    const tagNeedle = tagFilter.trim().toLowerCase();
    return questions.filter((q) => {
      if (category !== "all" && q.category !== category) return false;
      if (difficulty !== "all" && q.difficulty !== difficulty) return false;
      if (status !== "all" && statusOf(q.id) !== status) return false;
      if (tagNeedle && !q.tags.some((t) => t.toLowerCase().includes(tagNeedle))) return false;
      return true;
    });
  }, [questions, category, difficulty, status, tagFilter, statusOf]);

  const knownCount = useMemo(
    () => questions.filter((q) => statusOf(q.id) === "known").length,
    [questions, statusOf],
  );

  const categoryStats = useMemo(() => {
    const map = new Map<string, { total: number; known: number }>();
    questions.forEach((q) => {
      const cur = map.get(q.category) ?? { total: 0, known: 0 };
      cur.total += 1;
      if (statusOf(q.id) === "known") cur.known += 1;
      map.set(q.category, cur);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [questions, statusOf]);

  const patchProgress = async (
    questionId: string,
    next: "known" | "review" | "unseen",
    opts?: { skipRefresh?: boolean },
  ) => {
    setProgress((p) => ({ ...p, [questionId]: next }));
    await fetch("/api/questions/progress", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, status: next }),
    });
    if (!opts?.skipRefresh) router.refresh();
  };

  const startDrill = () => {
    let pool = questions.filter((q) => {
      if (drillCategory !== "all" && q.category !== drillCategory) return false;
      if (drillDifficulty !== "all" && q.difficulty !== drillDifficulty) return false;
      return true;
    });
    if (pool.length === 0) return;
    if (shuffle) pool = shuffleArray(pool);
    setDrillQueue(pool);
    setDrillIndex(0);
    setFlipped(false);
    setSessionKnown(0);
    setSessionReview(0);
    setSessionSkipped(0);
    setEndScreen(false);
    setDrillOpen(true);
  };

  const currentDrill = drillQueue[drillIndex];

  const drillAction = async (action: "known" | "review" | "skip") => {
    if (!currentDrill) return;
    if (action === "known") {
      setSessionKnown((n) => n + 1);
      await patchProgress(currentDrill.id, "known", { skipRefresh: true });
    } else if (action === "review") {
      setSessionReview((n) => n + 1);
      await patchProgress(currentDrill.id, "review", { skipRefresh: true });
    } else {
      setSessionSkipped((n) => n + 1);
    }
    const isLast = drillIndex + 1 >= drillQueue.length;
    if (isLast) {
      setEndScreen(true);
      router.refresh();
    } else {
      setDrillIndex((i) => i + 1);
      setFlipped(false);
    }
  };

  const closeDrill = () => {
    setDrillOpen(false);
    setEndScreen(false);
  };

  const difficultyBadge = (d: string) =>
    d === "Hard"
      ? "bg-red-500/20 text-red-300"
      : d === "Medium"
        ? "bg-amber-500/20 text-amber-300"
        : "bg-emerald-500/20 text-emerald-300";

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <aside className="w-full shrink-0 space-y-3 lg:w-56">
        <Card className="p-3 text-sm">
          <p className="mb-2 font-semibold text-zinc-200">Filters</p>
          <label className="mb-1 block text-xs text-zinc-500">Category</label>
          <select
            className="mb-2 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All" : c}
              </option>
            ))}
          </select>
          <label className="mb-1 block text-xs text-zinc-500">Difficulty</label>
          <select
            className="mb-2 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            {["all", "Easy", "Medium", "Hard"].map((d) => (
              <option key={d} value={d}>
                {d === "all" ? "All" : d}
              </option>
            ))}
          </select>
          <label className="mb-1 block text-xs text-zinc-500">Status</label>
          <select
            className="mb-2 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All</option>
            <option value="known">Known</option>
            <option value="review">Review</option>
            <option value="unseen">Unseen</option>
          </select>
          <label className="mb-1 block text-xs text-zinc-500">Tags</label>
          <Input
            placeholder="e.g. WACC"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="text-sm"
          />
        </Card>

        <Card className="p-3 text-sm">
          <p className="mb-2 font-semibold text-zinc-200">Drill setup</p>
          <select
            className="mb-2 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5"
            value={drillCategory}
            onChange={(e) => setDrillCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={`d-${c}`} value={c}>
                {c === "all" ? "All categories" : c}
              </option>
            ))}
          </select>
          <select
            className="mb-2 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5"
            value={drillDifficulty}
            onChange={(e) => setDrillDifficulty(e.target.value)}
          >
            {["all", "Easy", "Medium", "Hard"].map((d) => (
              <option key={`dd-${d}`} value={d}>
                {d === "all" ? "All difficulties" : d}
              </option>
            ))}
          </select>
          <label className="mb-2 flex items-center gap-2 text-xs text-zinc-400">
            <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} />
            Shuffle
          </label>
          <Button className="w-full" size="sm" onClick={startDrill}>
            Start Drill
          </Button>
        </Card>
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Question Bank</h1>
            <p className="text-sm text-zinc-400">
              Mastered {knownCount} / {TARGET_TOTAL} (bank has {questions.length} seeded)
            </p>
            <p className="text-sm text-cyan-400">Streak: {streakDisplay} day(s) · Weekly XP {weeklyXP} · Total XP {totalXP}</p>
            <p className="text-xs text-zinc-500">Daily streak updates from the dashboard daily drill.</p>
          </div>
          <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-zinc-800 sm:w-48">
            <div
              className="h-full bg-cyan-500 transition-all"
              style={{ width: `${Math.min(100, (knownCount / TARGET_TOTAL) * 100)}%` }}
            />
          </div>
        </div>

        <Card className="p-4">
          <p className="mb-3 text-sm font-semibold text-zinc-200">Progress by category</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {categoryStats.map(([cat, { total, known }]) => (
              <div key={cat}>
                <div className="mb-1 flex justify-between text-xs text-zinc-400">
                  <span>{cat}</span>
                  <span>
                    {known}/{total}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full bg-emerald-500/80"
                    style={{ width: `${total ? (known / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-2">
          {filteredBrowse.map((q) => {
            const st = statusOf(q.id);
            const open = expandedId === q.id;
            return (
              <Card
                key={q.id}
                className={cn("cursor-pointer p-4 transition-colors", open && "border-cyan-500/40")}
                onClick={() => setExpandedId(open ? null : q.id)}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">{q.category}</span>
                      <span className={cn("rounded px-2 py-0.5 text-xs", difficultyBadge(q.difficulty))}>
                        {q.difficulty}
                      </span>
                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs capitalize text-zinc-400">{st}</span>
                    </div>
                    <p className="text-sm font-medium text-zinc-100">{q.question}</p>
                    {open ? (
                      <div className="mt-3 border-t border-zinc-800 pt-3 text-sm text-zinc-300">
                        <p className="mb-2 whitespace-pre-wrap">{q.answer}</p>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); void patchProgress(q.id, "known"); }}>
                            Mark Known ✓
                          </Button>
                          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); void patchProgress(q.id, "review"); }}>
                            Mark for Review 🔁
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {drillOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/98 p-4 text-zinc-100 backdrop-blur">
          {endScreen ? (
            <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center text-center">
              <h2 className="text-2xl font-semibold">Session complete</h2>
              <p className="mt-4 text-zinc-400">
                Known: {sessionKnown} · Review: {sessionReview} · Skipped: {sessionSkipped}
              </p>
              <p className="mt-2 text-cyan-400">Streak: {streakDisplay} day(s)</p>
              <Button className="mt-8" onClick={closeDrill}>
                Close
              </Button>
            </div>
          ) : currentDrill ? (
            <>
              <div className="mb-4 flex items-center justify-between text-sm text-zinc-400">
                <span>
                  Card {drillIndex + 1} / {drillQueue.length}
                </span>
                <Button size="sm" variant="outline" onClick={closeDrill}>
                  Exit
                </Button>
              </div>
              <button
                type="button"
                className="mx-auto flex min-h-[50vh] w-full max-w-3xl flex-1 flex-col items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 p-8 text-left shadow-xl"
                onClick={() => setFlipped((f) => !f)}
              >
                {!flipped ? (
                  <>
                    <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Question</p>
                    <p className="text-lg font-medium">{currentDrill.question}</p>
                    <p className="mt-6 text-xs text-zinc-500">Tap to reveal answer</p>
                  </>
                ) : (
                  <>
                    <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Answer</p>
                    <p className="text-base text-zinc-200">{currentDrill.answer}</p>
                  </>
                )}
              </button>
              <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
                <Button onClick={() => void drillAction("known")}>Got it</Button>
                <Button variant="outline" onClick={() => void drillAction("review")}>
                  Need Review
                </Button>
                <Button variant="ghost" onClick={() => void drillAction("skip")}>
                  Skip
                </Button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
