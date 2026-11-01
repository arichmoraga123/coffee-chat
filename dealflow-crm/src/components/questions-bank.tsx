"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCareerTracks } from "@/components/career-track-provider";
import { matchesCareerTracks } from "@/lib/career-tracks";
import { ReportContentAction } from "@/components/report-content-action";
import { EmptyState } from "@/components/ui/empty-state";
import { firmsFromTags } from "@/lib/drill-mcq/firms";
import { gradeAnswerByKeywords, type KeywordGradeResult } from "@/lib/answer-grader";
import { PracticeModal } from "@/components/practice-modal";
import { getRelevantCategories, getTrackLearningPath } from "@/lib/track-utils";

export type QuestionDTO = {
  id: string;
  question: string;
  answer: string;
  category: string;
  subcategory: string | null;
  difficulty: string;
  tags: string[];
  keywords: string[];
  careerTracks: string[];
};

type ProgressMap = Record<string, "known" | "review" | "unseen">;


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
  initialTagFilter = "",
}: {
  questions: QuestionDTO[];
  initialProgress: ProgressMap;
  drillStreak: number;
  weeklyXP?: number;
  totalXP?: number;
  /** Comma-separated topics, e.g. from a lesson's "Drill related questions" link. */
  initialTagFilter?: string;
}) {
  const router = useRouter();
  const { careerTracks, narrowTrack } = useCareerTracks();
  const [progress, setProgress] = useState<ProgressMap>(initialProgress);
  const [category, setCategory] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState(initialTagFilter);
  const [firm, setFirm] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const [drillOpen, setDrillOpen] = useState(false);
  const [drillCategory, setDrillCategory] = useState("all");
  const [drillDifficulty, setDrillDifficulty] = useState("all");
  const [shuffle, setShuffle] = useState(true);
  const [drillQueue, setDrillQueue] = useState<QuestionDTO[]>([]);
  const [drillIndex, setDrillIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [gradedResult, setGradedResult] = useState<KeywordGradeResult | null>(null);
  const [sessionKnown, setSessionKnown] = useState(0);
  const [sessionReview, setSessionReview] = useState(0);
  const [sessionSkipped, setSessionSkipped] = useState(0);
  const [endScreen, setEndScreen] = useState(false);
  const [streakDisplay, setStreakDisplay] = useState(drillStreak);

  const progressSnap = JSON.stringify(initialProgress);
  useEffect(() => {
    setProgress(initialProgress);
  }, [progressSnap, initialProgress]);

  const trackFiltered = useMemo(
    () => questions.filter((q) => matchesCareerTracks(q.careerTracks, careerTracks, narrowTrack)),
    [questions, careerTracks, narrowTrack],
  );
  const relevantCategories = useMemo(() => getRelevantCategories(careerTracks), [careerTracks]);
  const learningPath = useMemo(() => getTrackLearningPath(careerTracks), [careerTracks]);

  const firms = useMemo(() => {
    const s = new Set<string>();
    for (const q of trackFiltered) for (const f of firmsFromTags(q.tags)) s.add(f);
    return Array.from(s).sort();
  }, [trackFiltered]);
  const matchesFirm = useCallback(
    (q: QuestionDTO) => firm === "all" || firmsFromTags(q.tags).includes(firm),
    [firm],
  );

  const categories = useMemo(() => {
    const s = new Set(trackFiltered.map((q) => q.category));
    return ["all", ...Array.from(s).sort()];
  }, [trackFiltered]);


  const statusOf = useCallback(
    (id: string) => progress[id] ?? "unseen",
    [progress],
  );

  const filteredBrowse = useMemo(() => {
    const tagNeedles = tagFilter
      .toLowerCase()
      .split(",")
      .map((t) => t.trim().replace(/-/g, " "))
      .filter(Boolean);
    const ranked = [...trackFiltered].sort((a, b) => {
      const aRec = relevantCategories.includes(a.category) ? 1 : 0;
      const bRec = relevantCategories.includes(b.category) ? 1 : 0;
      if (aRec !== bRec) return bRec - aRec;
      return a.question.localeCompare(b.question);
    });
    return ranked.filter((q) => {
      if (category !== "all" && q.category !== category) return false;
      if (difficulty !== "all" && q.difficulty !== difficulty) return false;
      if (status !== "all" && statusOf(q.id) !== status) return false;
      if (
        tagNeedles.length &&
        !tagNeedles.some(
          (n) =>
            q.tags.some((t) => t.toLowerCase().includes(n)) ||
            q.keywords.some((k) => k.toLowerCase().includes(n)) ||
            q.question.toLowerCase().includes(n),
        )
      )
        return false;
      if (!matchesFirm(q)) return false;
      return true;
    });
  }, [trackFiltered, category, difficulty, status, tagFilter, statusOf, relevantCategories, matchesFirm]);

  const dedupedFilteredBrowse = useMemo(() => {
    const seen = new Set<string>();
    const out: QuestionDTO[] = [];
    for (const q of filteredBrowse) {
      const key = q.question.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(q);
    }
    return out;
  }, [filteredBrowse]);

  const difficultyOrder: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 };
  const statusOrder: Record<string, number> = { unseen: 0, review: 1, known: 2 };

  const groupedBrowse = useMemo(() => {
    const byCategory = new Map<string, QuestionDTO[]>();
    for (const q of dedupedFilteredBrowse) {
      const cur = byCategory.get(q.category) ?? [];
      cur.push(q);
      byCategory.set(q.category, cur);
    }
    return Array.from(byCategory.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([cat, qs]) => {
        const counts = { known: 0, review: 0, unseen: 0 };
        for (const q of qs) {
          const st = statusOf(q.id);
          if (st === "known") counts.known += 1;
          else if (st === "review") counts.review += 1;
          else counts.unseen += 1;
        }
        const knownRate = qs.length ? counts.known / qs.length : 0;
        const dotClass =
          knownRate >= 0.8 ? "bg-success" : knownRate >= 0.4 ? "bg-warn" : "bg-ink-3";

        const byDifficulty = new Map<string, QuestionDTO[]>();
        for (const q of qs) {
          const d = ["Easy", "Medium", "Hard"].includes(q.difficulty) ? q.difficulty : "Medium";
          const cur = byDifficulty.get(d) ?? [];
          cur.push(q);
          byDifficulty.set(d, cur);
        }
        const difficultyGroups = Array.from(byDifficulty.entries())
          .sort((a, b) => (difficultyOrder[a[0]] ?? 99) - (difficultyOrder[b[0]] ?? 99))
          .map(([d, questions]) => ({
            difficulty: d,
            questions: [...questions].sort((a, b) => {
              const sa = statusOrder[statusOf(a.id)] ?? 99;
              const sb = statusOrder[statusOf(b.id)] ?? 99;
              if (sa !== sb) return sa - sb;
              return a.question.localeCompare(b.question);
            }),
          }));

        return {
          category: cat,
          questions: qs,
          counts,
          knownRate,
          dotClass,
          difficultyGroups,
        };
      });
  }, [dedupedFilteredBrowse, statusOf]);

  const knownCount = useMemo(
    () => trackFiltered.filter((q) => statusOf(q.id) === "known").length,
    [trackFiltered, statusOf],
  );

  const categoryStats = useMemo(() => {
    const map = new Map<string, { total: number; known: number }>();
    trackFiltered.forEach((q) => {
      const cur = map.get(q.category) ?? { total: 0, known: 0 };
      cur.total += 1;
      if (statusOf(q.id) === "known") cur.known += 1;
      map.set(q.category, cur);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [trackFiltered, statusOf]);

  useEffect(() => {
    if (drillCategory !== "all") return;
    const firstRelevant = categories.find((c) => c !== "all" && relevantCategories.includes(c));
    if (firstRelevant) setDrillCategory(firstRelevant);
  }, [categories, relevantCategories, drillCategory]);

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
    let pool = trackFiltered.filter((q) => {
      if (drillCategory !== "all" && q.category !== drillCategory) return false;
      if (drillDifficulty !== "all" && q.difficulty !== drillDifficulty) return false;
      if (!matchesFirm(q)) return false;
      return true;
    });
    if (pool.length === 0) return;
    if (shuffle) pool = shuffleArray(pool);
    setDrillQueue(pool);
    setDrillIndex(0);
    setFlipped(false);
    setTypedAnswer("");
    setGradedResult(null);
    setSessionKnown(0);
    setSessionReview(0);
    setSessionSkipped(0);
    setEndScreen(false);
    setDrillOpen(true);
  };

  const openPracticeFor = (questionId: string) => {
    const foundIndex = dedupedFilteredBrowse.findIndex((q) => q.id === questionId);
    if (foundIndex < 0) return;
    setPracticeIndex(foundIndex);
    setPracticeOpen(true);
  };

  const filtersActive =
    category !== "all" || difficulty !== "all" || status !== "all" || firm !== "all" || tagFilter.trim().length > 0;

  useEffect(() => {
    if (!filtersActive) return;
    const next: Record<string, boolean> = {};
    for (const g of groupedBrowse) next[g.category] = true;
    setExpandedCategories(next);
  }, [filtersActive, groupedBrowse]);

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
      setTypedAnswer("");
      setGradedResult(null);
    }
  };

  const closeDrill = () => {
    setDrillOpen(false);
    setEndScreen(false);
    setTypedAnswer("");
    setGradedResult(null);
  };

  const onFlashcardFlip = () => {
    if (!currentDrill) return;
    setFlipped((prev) => {
      const next = !prev;
      if (next && typedAnswer.trim()) {
        setGradedResult(
          gradeAnswerByKeywords({
            userAnswer: typedAnswer,
            modelAnswer: currentDrill.answer,
            keywords: currentDrill.keywords,
          }),
        );
      } else if (!next) {
        setGradedResult(null);
      }
      return next;
    });
  };

  const difficultyBadge = (d: string) =>
    d === "Hard"
      ? "border border-border-strong bg-surface text-accent"
      : d === "Medium"
        ? "border border-border bg-surface text-ink-3"
        : "border border-border bg-surface-2 text-ink-3";

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <aside className="w-full shrink-0 space-y-3 lg:w-56">
        <Card className="p-3 text-sm">
          <p className="mb-2 font-semibold text-ink">Filters</p>
          <label className="mb-1 block text-xs text-ink-3">Category</label>
          <select
            className="mb-2 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All" : c}
              </option>
            ))}
          </select>
          <label className="mb-1 block text-xs text-ink-3">Difficulty</label>
          <select
            className="mb-2 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            {["all", "Easy", "Medium", "Hard"].map((d) => (
              <option key={d} value={d}>
                {d === "all" ? "All" : d}
              </option>
            ))}
          </select>
          <label className="mb-1 block text-xs text-ink-3">Status</label>
          <select
            className="mb-2 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All</option>
            <option value="known">Known</option>
            <option value="review">Review</option>
            <option value="unseen">Unseen</option>
          </select>
          <label className="mb-1 block text-xs text-ink-3">Firm (reported questions)</label>
          <select
            className="mb-2 w-full rounded border border-border bg-surface px-2 py-1.5 text-sm"
            value={firm}
            onChange={(e) => setFirm(e.target.value)}
          >
            <option value="all">All firms</option>
            {firms.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <label className="mb-1 block text-xs text-ink-3">Tags</label>
          <Input
            placeholder="e.g. WACC, beta"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="text-sm"
          />
        </Card>

        <Card className="p-3 text-sm">
          <p className="mb-2 font-semibold text-ink">Drill setup</p>
          <select
            className="mb-2 w-full rounded border border-border bg-surface px-2 py-1.5"
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
            className="mb-2 w-full rounded border border-border bg-surface px-2 py-1.5"
            value={drillDifficulty}
            onChange={(e) => setDrillDifficulty(e.target.value)}
          >
            {["all", "Easy", "Medium", "Hard"].map((d) => (
              <option key={`dd-${d}`} value={d}>
                {d === "all" ? "All difficulties" : d}
              </option>
            ))}
          </select>
          <label className="mb-2 flex items-center gap-2 text-xs text-ink-2">
            <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} />
            Shuffle
          </label>
          <Button className=" w-full" size="sm" variant="cta" onClick={startDrill}>
            Start flashcards
          </Button>
        </Card>
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title">Question Bank</h1>
            <p className="text-sm text-ink-2">
              Mastered {knownCount} / {trackFiltered.length} questions for your career tracks
            </p>
            <p className="text-sm text-ink-3">
              Streak: <span className="text-accent">{streakDisplay}</span> day(s) · Weekly XP{" "}
              <span className="text-accent">{weeklyXP}</span> · Total XP {totalXP}
            </p>
            <p className="text-xs text-ink-3">Daily streak updates from the dashboard daily drill.</p>
            <p className="mt-2 text-xs text-ink-2">
              Study mode — flip cards and say the answer out loud. For graded multiple choice from the PE@Broad bank,{" "}
              <Link href="/practice" className="font-medium text-accent hover:underline">
                go to Practice →
              </Link>
            </p>
          </div>
          <div className="h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-surface-2 ring-1 ring-border sm:w-48">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
              style={{ width: `${Math.min(100, (knownCount / Math.max(1, trackFiltered.length)) * 100)}%` }}
            />
          </div>
        </div>

        <Card className="p-4">
          {learningPath.length > 0 ? (
            <div className="mb-4 rounded-lg border border-border bg-surface p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Learning path</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {learningPath.map((step) => (
                  <button
                    key={step}
                    type="button"
                    className="rounded border border-border-strong px-2 py-1 text-xs text-ink-2 hover:border-border-strong"
                    onClick={() => {
                      setCategory(step);
                      setExpandedCategories((prev) => ({ ...prev, [step]: true }));
                    }}
                  >
                    {step}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <p className="mb-3 text-sm font-semibold text-ink">Progress by category</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {categoryStats.map(([cat, { total, known }]) => (
              <div key={cat}>
                <div className="mb-1 flex justify-between text-xs text-ink-2">
                  <span className="inline-flex items-center gap-1">
                    {cat}
                    {relevantCategories.includes(cat) ? (
                      <span className="rounded bg-warn-bg px-1.5 py-0.5 text-[10px] text-warn">Priority</span>
                    ) : null}
                  </span>
                  <span>
                    {known}/{total}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2 ring-1 ring-border">
                  <div
                    className="h-full rounded-full bg-accent-tint transition-[width] duration-500"
                    style={{ width: `${total ? (known / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-2">
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setExpandedCategories(
                  Object.fromEntries(groupedBrowse.map((g) => [g.category, true])) as Record<string, boolean>,
                )
              }
              disabled={groupedBrowse.length === 0}
            >
              Expand All
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setExpandedCategories({})}
              disabled={groupedBrowse.length === 0}
            >
              Collapse All
            </Button>
          </div>
          {dedupedFilteredBrowse.length === 0 ? (
            <EmptyState
              title="No questions match filters"
              description="Try a different category, difficulty, or clear the tag search."
            />
          ) : null}
          {groupedBrowse.map((group) => {
            const expanded = !!expandedCategories[group.category];
            return (
              <Card key={group.category} className="overflow-hidden p-0">
                <button
                  type="button"
                  className="w-full cursor-pointer p-4 text-left transition-colors hover:bg-surface"
                  onClick={() =>
                    setExpandedCategories((prev) => ({ ...prev, [group.category]: !prev[group.category] }))
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", group.dotClass)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-ink">{group.category}</p>
                        <span className="text-xs text-ink-3">({group.questions.length})</span>
                        <span className="text-xs text-ink-3">
                          Known {group.counts.known} · Review {group.counts.review} · Unseen {group.counts.unseen}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2 ring-1 ring-border">
                        <div
                          className="h-full rounded-full bg-accent-tint transition-[width] duration-500"
                          style={{ width: `${Math.round(group.knownRate * 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-ink-3">{Math.round(group.knownRate * 100)}% mastered</p>
                    </div>
                    <span className="text-ink-3">{expanded ? "▾" : "▸"}</span>
                  </div>
                </button>
                {expanded ? (
                  <div className="border-t border-border px-3 pb-3">
                    {group.difficultyGroups.map((dg) => (
                      <div key={`${group.category}-${dg.difficulty}`} className="pt-3">
                        <div className="mb-2 border-b border-border pb-1">
                          <p className="text-xs font-medium text-ink-3">
                            {dg.difficulty} ({dg.questions.length})
                          </p>
                        </div>
                        <div className="space-y-2">
                          {dg.questions.map((q) => {
                            const st = statusOf(q.id);
                            return (
                              <Card
                                key={q.id}
                                className="cursor-pointer p-3 transition-colors hover:border-accent"
                                onClick={() => openPracticeFor(q.id)}
                              >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex flex-wrap gap-2">
                                      <span className={cn("rounded px-2 py-0.5 text-xs", difficultyBadge(q.difficulty))}>
                                        {q.difficulty}
                                      </span>
                                      <span className="rounded bg-surface-2 px-2 py-0.5 text-xs capitalize text-ink-2">
                                        {st}
                                      </span>
                                      {relevantCategories.includes(q.category) ? (
                                        <span className="rounded bg-success-bg px-2 py-0.5 text-xs text-success">
                                          Recommended
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="text-sm font-medium text-ink">{q.question}</p>
                                  </div>
                                  <ReportContentAction targetType="question" targetId={q.id} />
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      </div>

      {drillOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-surface p-4 text-ink ">
          {endScreen ? (
            <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center text-center">
              <h2 className="text-2xl font-semibold">Session complete</h2>
              <p className="mt-4 text-ink-2">
                Known: {sessionKnown} · Review: {sessionReview} · Skipped: {sessionSkipped}
              </p>
              <p className="mt-2 text-ink-3">
                Streak: <span className="text-accent">{streakDisplay}</span> day(s)
              </p>
              <Button className="mt-8" onClick={closeDrill}>
                Close
              </Button>
            </div>
          ) : currentDrill ? (
            <>
              <div className="mb-4 flex items-center justify-between text-sm text-ink-2">
                <span>
                  Card {drillIndex + 1} / {drillQueue.length}
                </span>
                <Button size="sm" variant="outline" onClick={closeDrill}>
                  Exit
                </Button>
              </div>
              <div className="perspective-flip mx-auto w-full max-w-3xl flex-1">
                <button
                  type="button"
                  className="relative w-full cursor-pointer border-0 bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
                  onClick={onFlashcardFlip}
                >
                  <div className={cn("flip-card-inner ", flipped && "is-flipped")}>
                    <div className="flip-card-face border border-border   ">
                      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-ink-3">Question</p>
                      <p className="text-lg font-medium text-ink">{currentDrill.question}</p>
                      <div className="mt-5">
                        <label className="mb-1 block text-xs uppercase tracking-[0.14em] text-ink-3">
                          Type your answer (optional)
                        </label>
                        <textarea
                          className="min-h-24 w-full rounded border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-border-strong focus:ring-1 focus:ring-accent"
                          placeholder="Write your answer before flipping..."
                          value={typedAnswer}
                          onChange={(e) => setTypedAnswer(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <p className="mt-6 text-xs text-ink-3">Tap to flip · reveal answer</p>
                    </div>
                    <div className="flip-card-face flip-card-back border border-border bg-surface">
                      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-ink-3">Answer</p>
                      <p className="text-base text-ink">{currentDrill.answer}</p>
                    </div>
                  </div>
                </button>
              </div>
              <div className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-2">
                {flipped && gradedResult ? (
                  <>
                    <div className="w-full rounded border border-border bg-surface p-3 text-sm text-ink">
                      <p className="font-medium text-ink">
                        {gradedResult.grade === "correct"
                          ? "Correct"
                          : gradedResult.grade === "partial"
                            ? "Partial"
                            : "Needs review"}{" "}
                        ({Math.round(gradedResult.hitRate * 100)}% keyword hit)
                      </p>
                      <p className="mt-1 text-xs text-ink-3">
                        {gradedResult.foundKeywords.length > 0
                          ? `✓ mentioned ${gradedResult.foundKeywords.join(", ")}`
                          : "✓ mentioned: none"}
                      </p>
                      <p className="text-xs text-ink-3">
                        {gradedResult.missedKeywords.length > 0
                          ? `✗ missed: ${gradedResult.missedKeywords.join(", ")}`
                          : "✗ missed: none"}
                      </p>
                    </div>
                    <Button onClick={() => void drillAction(gradedResult.suggestedAction === "known" ? "known" : "review")}>
                      Continue
                    </Button>
                    <Button variant="ghost" onClick={() => void drillAction("skip")}>
                      Skip
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => void drillAction("known")}>Got it</Button>
                    <Button variant="outline" onClick={() => void drillAction("review")}>
                      Need Review
                    </Button>
                    <Button variant="ghost" onClick={() => void drillAction("skip")}>
                      Skip
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <PracticeModal
        open={practiceOpen}
        title="Question Practice"
        questions={dedupedFilteredBrowse.map((q) => ({
          id: q.id,
          question: q.question,
          answer: q.answer,
          category: q.category,
          difficulty: q.difficulty,
          sourceLabel: "Question Bank",
          keywords: q.keywords,
          statusLabel: statusOf(q.id),
        }))}
        index={practiceIndex}
        onClose={() => setPracticeOpen(false)}
        onNavigate={setPracticeIndex}
        onMarkKnown={async (id) => {
          await patchProgress(id, "known");
        }}
        onMarkReview={async (id) => {
          await patchProgress(id, "review");
        }}
      />
    </div>
  );
}
