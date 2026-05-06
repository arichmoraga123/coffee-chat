"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCareerTracks } from "@/components/career-track-provider";
import { matchesCareerTracks } from "@/lib/career-tracks";
import { QuestionMcqDeck } from "@/components/question-mcq-deck";
import { ReportContentAction } from "@/components/report-content-action";
import { EmptyState } from "@/components/ui/empty-state";
import type { McqDistractorSource } from "@/lib/question-mcq";
import { gradeAnswerByKeywords, type KeywordGradeResult } from "@/lib/answer-grader";
import { PracticeModal } from "@/components/practice-modal";
import { getRelevantCategories, getTrackLearningPath } from "@/lib/track-utils";
import {
  readStoredQuestionMode,
  writeStoredQuestionMode,
  type QuestionPracticeMode,
} from "@/lib/question-mode-storage";

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
  const { careerTracks, narrowTrack } = useCareerTracks();
  const [progress, setProgress] = useState<ProgressMap>(initialProgress);
  const [category, setCategory] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const [practiceMode, setPracticeMode] = useState<QuestionPracticeMode>("mcq");
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillUseMcq, setDrillUseMcq] = useState(false);
  const [mcqBrowseOpen, setMcqBrowseOpen] = useState(false);
  const [drillCategory, setDrillCategory] = useState("all");
  const [drillDifficulty, setDrillDifficulty] = useState("all");
  const [shuffle, setShuffle] = useState(true);
  const [drillQueue, setDrillQueue] = useState<QuestionDTO[]>([]);
  const [browseMcqQueue, setBrowseMcqQueue] = useState<QuestionDTO[]>([]);
  const [drillIndex, setDrillIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [gradedResult, setGradedResult] = useState<KeywordGradeResult | null>(null);
  const [sessionKnown, setSessionKnown] = useState(0);
  const [sessionReview, setSessionReview] = useState(0);
  const [sessionSkipped, setSessionSkipped] = useState(0);
  const [endScreen, setEndScreen] = useState(false);
  const [streakDisplay, setStreakDisplay] = useState(drillStreak);
  const [mcqSummary, setMcqSummary] = useState<{
    score: number;
    total: number;
    xpEarned: number;
    ms: number;
  } | null>(null);
  const sessionStartRef = useRef<number | null>(null);

  useEffect(() => {
    setPracticeMode(readStoredQuestionMode());
  }, []);

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

  const categories = useMemo(() => {
    const s = new Set(trackFiltered.map((q) => q.category));
    return ["all", ...Array.from(s).sort()];
  }, [trackFiltered]);

  const distractorPool: McqDistractorSource[] = useMemo(
    () => trackFiltered.map((q) => ({ id: q.id, answer: q.answer, category: q.category })),
    [trackFiltered],
  );

  const statusOf = useCallback(
    (id: string) => progress[id] ?? "unseen",
    [progress],
  );

  const filteredBrowse = useMemo(() => {
    const tagNeedle = tagFilter.trim().toLowerCase();
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
      if (tagNeedle && !q.tags.some((t) => t.toLowerCase().includes(tagNeedle))) return false;
      return true;
    });
  }, [trackFiltered, category, difficulty, status, tagFilter, statusOf, relevantCategories]);

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
          knownRate >= 0.8 ? "bg-emerald-500" : knownRate >= 0.4 ? "bg-amber-500" : "bg-zinc-500";

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

  const setModeAndStore = (m: QuestionPracticeMode) => {
    setPracticeMode(m);
    writeStoredQuestionMode(m);
  };

  const startDrill = () => {
    let pool = trackFiltered.filter((q) => {
      if (drillCategory !== "all" && q.category !== drillCategory) return false;
      if (drillDifficulty !== "all" && q.difficulty !== drillDifficulty) return false;
      return true;
    });
    if (pool.length === 0) return;
    if (shuffle) pool = shuffleArray(pool);
    setDrillQueue(pool);
    setDrillUseMcq(practiceMode === "mcq");
    setDrillIndex(0);
    setFlipped(false);
    setTypedAnswer("");
    setGradedResult(null);
    setSessionKnown(0);
    setSessionReview(0);
    setSessionSkipped(0);
    setEndScreen(false);
    setMcqSummary(null);
    sessionStartRef.current = Date.now();
    setDrillOpen(true);
  };

  const startBrowseMcq = () => {
    if (filteredBrowse.length === 0) return;
    setBrowseMcqQueue(shuffleArray([...filteredBrowse]));
    setMcqBrowseOpen(true);
    setMcqSummary(null);
    sessionStartRef.current = Date.now();
  };

  const openPracticeFor = (questionId: string) => {
    const foundIndex = dedupedFilteredBrowse.findIndex((q) => q.id === questionId);
    if (foundIndex < 0) return;
    setPracticeIndex(foundIndex);
    setPracticeOpen(true);
  };

  const filtersActive = category !== "all" || difficulty !== "all" || status !== "all" || tagFilter.trim().length > 0;

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
    setDrillUseMcq(false);
    setMcqSummary(null);
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

  const closeBrowseMcq = () => {
    setMcqBrowseOpen(false);
    setMcqSummary(null);
  };

  const onMcqDrillComplete = (results: { questionId: string; action: "known" | "review" | "skip" }[]) => {
    const started = sessionStartRef.current ?? Date.now();
    const score = results.filter((r) => r.action === "known").length;
    const xpEarned = score * 10;
    setMcqSummary({
      score,
      total: results.length,
      xpEarned,
      ms: Date.now() - started,
    });
    setEndScreen(true);
    void router.refresh();
  };

  const onMcqBrowseComplete = (results: { questionId: string; action: "known" | "review" | "skip" }[]) => {
    const started = sessionStartRef.current ?? Date.now();
    const score = results.filter((r) => r.action === "known").length;
    const xpEarned = score * 10;
    setMcqSummary({
      score,
      total: results.length,
      xpEarned,
      ms: Date.now() - started,
    });
    setMcqBrowseOpen(false);
    void router.refresh();
  };

  const difficultyBadge = (d: string) =>
    d === "Hard"
      ? "border border-[#3a3a3a] bg-[#161616] text-[#c9a84c]"
      : d === "Medium"
        ? "border border-[#2a2a2a] bg-[#161616] text-[#888888]"
        : "border border-[#2a2a2a] bg-[#1a1a1a] text-[#888888]";

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <aside className="w-full shrink-0 space-y-3 lg:w-56">
        <Card className="p-3 text-sm">
          <p className="mb-2 font-semibold text-zinc-200">Filters</p>
          <label className="mb-1 block text-xs text-zinc-500">Category</label>
          <select
            className="mb-2 w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm"
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
            className="mb-2 w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm"
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
            className="mb-2 w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm"
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
          <label className="mb-1 block text-xs text-zinc-500">Mode (saved)</label>
          <select
            className="mb-2 w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5"
            value={practiceMode}
            onChange={(e) => setModeAndStore(e.target.value as QuestionPracticeMode)}
          >
            <option value="mcq">MCQ (auto-graded)</option>
            <option value="flashcard">Study Mode (flashcard)</option>
          </select>
          <select
            className="mb-2 w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5"
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
            className="mb-2 w-full rounded border border-white/10 bg-zinc-950 px-2 py-1.5"
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
          <Button className="animate-df-pulse-glow w-full" size="sm" variant="cta" onClick={startDrill}>
            Start drill ({practiceMode === "mcq" ? "MCQ" : "Study Mode"})
          </Button>
        </Card>
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-zinc-900/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title">Question Bank</h1>
            <p className="text-sm text-zinc-400">
              Mastered {knownCount} / {TARGET_TOTAL} (showing {trackFiltered.length} for your career tracks)
            </p>
            <p className="text-sm text-[#888888]">
              Streak: <span className="text-[#c9a84c]">{streakDisplay}</span> day(s) · Weekly XP{" "}
              <span className="text-[#4a6fa5]">{weeklyXP}</span> · Total XP {totalXP}
            </p>
            <p className="text-xs text-zinc-500">Daily streak updates from the dashboard daily drill.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-500">Default mode:</span>
              <select
                className="rounded border border-white/10 bg-zinc-950 px-2 py-1 text-xs"
                value={practiceMode}
                onChange={(e) => setModeAndStore(e.target.value as QuestionPracticeMode)}
              >
                <option value="mcq">MCQ (auto-graded)</option>
                <option value="flashcard">Study Mode (flashcard)</option>
              </select>
              <Button size="sm" variant="outline" disabled={filteredBrowse.length === 0} onClick={startBrowseMcq}>
                MCQ quiz · filtered ({filteredBrowse.length})
              </Button>
            </div>
          </div>
          <div className="h-2.5 w-full max-w-xs overflow-hidden rounded-full bg-zinc-800/90 ring-1 ring-white/5 sm:w-48">
            <div
              className="h-full rounded-full bg-[#4a6fa5] transition-[width] duration-500 ease-out"
              style={{ width: `${Math.min(100, (knownCount / TARGET_TOTAL) * 100)}%` }}
            />
          </div>
        </div>

        <Card className="p-4">
          {learningPath.length > 0 ? (
            <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Learning path</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {learningPath.map((step) => (
                  <button
                    key={step}
                    type="button"
                    className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-500"
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
          <p className="mb-3 text-sm font-semibold text-zinc-200">Progress by category</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {categoryStats.map(([cat, { total, known }]) => (
              <div key={cat}>
                <div className="mb-1 flex justify-between text-xs text-zinc-400">
                  <span className="inline-flex items-center gap-1">
                    {cat}
                    {relevantCategories.includes(cat) ? (
                      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">Priority</span>
                    ) : null}
                  </span>
                  <span>
                    {known}/{total}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800/90 ring-1 ring-white/5">
                  <div
                    className="h-full rounded-full bg-[#4a6fa5]/85 transition-[width] duration-500"
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
                  className="w-full cursor-pointer p-4 text-left transition-colors hover:bg-zinc-900/40"
                  onClick={() =>
                    setExpandedCategories((prev) => ({ ...prev, [group.category]: !prev[group.category] }))
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", group.dotClass)} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-zinc-100">{group.category}</p>
                        <span className="text-xs text-zinc-500">({group.questions.length})</span>
                        <span className="text-xs text-zinc-500">
                          Known {group.counts.known} · Review {group.counts.review} · Unseen {group.counts.unseen}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800/90 ring-1 ring-white/5">
                        <div
                          className="h-full rounded-full bg-[#4a6fa5]/85 transition-[width] duration-500"
                          style={{ width: `${Math.round(group.knownRate * 100)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-500">{Math.round(group.knownRate * 100)}% mastered</p>
                    </div>
                    <span className="text-zinc-500">{expanded ? "▾" : "▸"}</span>
                  </div>
                </button>
                {expanded ? (
                  <div className="border-t border-zinc-800 px-3 pb-3">
                    {group.difficultyGroups.map((dg) => (
                      <div key={`${group.category}-${dg.difficulty}`} className="pt-3">
                        <div className="mb-2 border-b border-zinc-800 pb-1">
                          <p className="text-xs font-medium text-zinc-500">
                            {dg.difficulty} ({dg.questions.length})
                          </p>
                        </div>
                        <div className="space-y-2">
                          {dg.questions.map((q) => {
                            const st = statusOf(q.id);
                            return (
                              <Card
                                key={q.id}
                                className="cursor-pointer p-3 transition-colors hover:border-[#4a6fa5]/40"
                                onClick={() => openPracticeFor(q.id)}
                              >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex flex-wrap gap-2">
                                      <span className={cn("rounded px-2 py-0.5 text-xs", difficultyBadge(q.difficulty))}>
                                        {q.difficulty}
                                      </span>
                                      <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs capitalize text-zinc-400">
                                        {st}
                                      </span>
                                      {relevantCategories.includes(q.category) ? (
                                        <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                                          Recommended
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="text-sm font-medium text-zinc-100">{q.question}</p>
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
        <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/98 p-4 text-zinc-100 backdrop-blur">
          {endScreen ? (
            <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center text-center">
              <h2 className="text-2xl font-semibold">Session complete</h2>
              {drillUseMcq && mcqSummary ? (
                <>
                  <p className="mt-4 text-lg text-zinc-200">
                    Score {mcqSummary.score}/{mcqSummary.total}
                  </p>
                  <p className="mt-2 text-zinc-400">
                    +{mcqSummary.xpEarned} XP · {(mcqSummary.ms / 1000).toFixed(1)}s
                  </p>
                </>
              ) : (
                <p className="mt-4 text-zinc-400">
                  Known: {sessionKnown} · Review: {sessionReview} · Skipped: {sessionSkipped}
                </p>
              )}
              <p className="mt-2 text-[#888888]">
                Streak: <span className="text-[#c9a84c]">{streakDisplay}</span> day(s)
              </p>
              <Button className="mt-8" onClick={closeDrill}>
                Close
              </Button>
            </div>
          ) : drillUseMcq && drillQueue.length ? (
            <QuestionMcqDeck
              questions={drillQueue}
              distractorPool={distractorPool}
              persistEachAnswer
              onComplete={onMcqDrillComplete}
              onExit={closeDrill}
            />
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
              <div className="perspective-flip mx-auto w-full max-w-3xl flex-1">
                <button
                  type="button"
                  className="relative w-full cursor-pointer border-0 bg-transparent p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a6fa5]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
                  onClick={onFlashcardFlip}
                >
                  <div className={cn("flip-card-inner shadow-xl", flipped && "is-flipped")}>
                    <div className="flip-card-face border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950">
                      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">Question</p>
                      <p className="text-lg font-medium text-zinc-100">{currentDrill.question}</p>
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
                      <p className="text-base text-zinc-100">{currentDrill.answer}</p>
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
                          ? "Correct"
                          : gradedResult.grade === "partial"
                            ? "Partial"
                            : "Needs review"}{" "}
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

      {mcqBrowseOpen && browseMcqQueue.length ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/98 p-4 text-zinc-100 backdrop-blur">
          <QuestionMcqDeck
            questions={browseMcqQueue}
            distractorPool={distractorPool}
            persistEachAnswer
            onComplete={onMcqBrowseComplete}
            onExit={closeBrowseMcq}
          />
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
