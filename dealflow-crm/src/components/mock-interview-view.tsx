"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { MOCK_INTERVIEW_BANKS } from "@/lib/mock-interview-constants";
import { cn } from "@/lib/utils";
import { useCareerTracks } from "@/components/career-track-provider";
import { matchesCareerTracks } from "@/lib/career-tracks";
import { ConsultingCasePractice } from "@/components/consulting-case-practice";
import { PracticeModal, type PracticeQuestion } from "@/components/practice-modal";
import { getRelevantBanks } from "@/lib/track-utils";

type Q = {
  id: string;
  question: string;
  category: string;
  bankSource: string;
  year: number | null;
  difficulty: string;
  modelAnswer: string | null;
  tips: string | null;
  careerTracks: string[];
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function MockInterviewView() {
  const { careerTracks, narrowTrack } = useCareerTracks();
  const [activeTab, setActiveTab] = useState<"question-bank" | "case-practice">("question-bank");
  const [mode, setMode] = useState<"practice" | "timed" | "bank-specific">("practice");
  const [bankCounts, setBankCounts] = useState<Record<string, number>>({});
  const [allQuestions, setAllQuestions] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);
  const [bankFilter, setBankFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [attemptedToday, setAttemptedToday] = useState(0);
  const [streak, setStreak] = useState(0);
  const [recentQuestions, setRecentQuestions] = useState<
    { id: string; question: string; category: string; bankSource: string; difficulty: string; year: number | null }[]
  >([]);

  const [timedOpen, setTimedOpen] = useState(false);
  const [timedQueue, setTimedQueue] = useState<Q[]>([]);
  const [timedIndex, setTimedIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(90);
  const relevantBanks = useMemo(() => getRelevantBanks(careerTracks), [careerTracks]);
  const [submitQ, setSubmitQ] = useState({
    question: "",
    bankSource: "Case in Point / General Consulting",
    category: "Behavioral",
    difficulty: "Medium",
    year: "2026",
    modelAnswer: "",
  });

  const refreshCounts = useCallback(async () => {
    const res = await fetch("/api/mock-interview/questions");
    if (!res.ok) return;
    const data = (await res.json()) as { bankCounts?: Record<string, number>; questions?: Q[] };
    const all = data.questions ?? [];
    setAllQuestions(all);
    if (!careerTracks.length) {
      setBankCounts(data.bankCounts ?? {});
      return;
    }
    const filtered = all.filter((q) => matchesCareerTracks(q.careerTracks ?? [], careerTracks, narrowTrack));
    const nextCounts: Record<string, number> = {};
    for (const q of filtered) {
      nextCounts[q.bankSource] = (nextCounts[q.bankSource] ?? 0) + 1;
    }
    setBankCounts(nextCounts);
  }, [careerTracks, narrowTrack]);

  useEffect(() => {
    void refreshCounts().finally(() => setLoading(false));
  }, [refreshCounts, careerTracks, narrowTrack]);

  useEffect(() => {
    if (!timedOpen || timedQueue.length === 0) return;
    setSecondsLeft(90);
    const t = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setTimedIndex((i) => Math.min(i + 1, timedQueue.length - 1));
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [timedOpen, timedIndex, timedQueue.length]);

  useEffect(() => {
    const loadSessionMeta = async () => {
      const res = await fetch("/api/mock-interview/sessions");
      if (!res.ok) return;
      const data = (await res.json()) as {
        attemptedToday: number;
        streak: number;
        recentQuestions: {
          id: string;
          question: string;
          category: string;
          bankSource: string;
          difficulty: string;
          year: number | null;
        }[];
      };
      setAttemptedToday(data.attemptedToday ?? 0);
      setStreak(data.streak ?? 0);
      setRecentQuestions(data.recentQuestions ?? []);
    };
    void loadSessionMeta();
  }, []);

  useEffect(() => {
    const savedBank = localStorage.getItem("mock:lastBank");
    if (savedBank && MOCK_INTERVIEW_BANKS.includes(savedBank as (typeof MOCK_INTERVIEW_BANKS)[number])) {
      setBankFilter(savedBank);
      return;
    }
    const suggested = relevantBanks.find((b) => MOCK_INTERVIEW_BANKS.includes(b as (typeof MOCK_INTERVIEW_BANKS)[number]));
    if (suggested) setBankFilter(suggested);
  }, [relevantBanks]);

  useEffect(() => {
    if (bankFilter) localStorage.setItem("mock:lastBank", bankFilter);
  }, [bankFilter]);

  const scopedQuestions = useMemo(() => {
    const byTrack = allQuestions.filter((q) => matchesCareerTracks(q.careerTracks ?? [], careerTracks, narrowTrack));
    if (mode === "bank-specific" && bankFilter) return byTrack.filter((q) => q.bankSource === bankFilter);
    if (bankFilter) return byTrack.filter((q) => q.bankSource === bankFilter);
    return byTrack;
  }, [allQuestions, careerTracks, narrowTrack, mode, bankFilter]);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(scopedQuestions.map((q) => q.category))).sort()],
    [scopedQuestions],
  );
  const years = useMemo(
    () => ["all", ...Array.from(new Set(scopedQuestions.map((q) => String(q.year ?? "N/A")))).sort()],
    [scopedQuestions],
  );

  const filteredQuestions = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return scopedQuestions.filter((q) => {
      if (categoryFilter !== "all" && q.category !== categoryFilter) return false;
      if (difficultyFilter !== "all" && q.difficulty !== difficultyFilter) return false;
      if (yearFilter !== "all" && String(q.year ?? "N/A") !== yearFilter) return false;
      if (needle && !q.question.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [scopedQuestions, categoryFilter, difficultyFilter, yearFilter, search]);

  useEffect(() => {
    const savedQuestionId = localStorage.getItem("mock:lastQuestionId");
    if (!savedQuestionId) return;
    const found = filteredQuestions.findIndex((q) => q.id === savedQuestionId);
    if (found >= 0) setPracticeIndex(found);
  }, [filteredQuestions]);

  const openPractice = (questionId: string) => {
    const found = filteredQuestions.findIndex((q) => q.id === questionId);
    if (found < 0) return;
    setPracticeIndex(found);
    setPracticeOpen(true);
    localStorage.setItem("mock:lastQuestionId", questionId);
  };

  const logPracticeAttempt = async (questionId: string, outcome: "known" | "review") => {
    await fetch("/api/mock-interview/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: mode === "bank-specific" ? "bank-specific" : "practice",
        bankFilter,
        questions: [questionId],
        scores: { [questionId]: outcome },
        duration: 90,
      }),
    });
    setAttemptedToday((n) => n + 1);
  };

  const startTimed = () => {
    const candidates = scopedQuestions.length ? scopedQuestions : filteredQuestions;
    if (!candidates.length) {
      alert("No questions for current filter.");
      return;
    }
    const queue = shuffle(candidates).slice(0, 20);
    setTimedQueue(queue);
    setTimedIndex(0);
    setSecondsLeft(90);
    setTimedOpen(true);
    setMode("timed");
  };

  const completeTimed = async () => {
    if (!timedQueue.length) return;
    await fetch("/api/mock-interview/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "timed",
        bankFilter,
        questions: timedQueue.map((q) => q.id),
        scores: {},
        duration: (20 - Math.max(0, 20 - timedQueue.length)) * 90,
      }),
    });
    setTimedOpen(false);
    setTimedQueue([]);
    setTimedIndex(0);
    setSecondsLeft(90);
    const refresh = await fetch("/api/mock-interview/sessions");
    if (refresh.ok) {
      const d = (await refresh.json()) as { attemptedToday: number; streak: number };
      setAttemptedToday(d.attemptedToday ?? 0);
      setStreak(d.streak ?? 0);
    }
  };

  const submitQuestion = async () => {
    const res = await fetch("/api/mock-interview/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...submitQ,
        year: submitQ.year ? Number(submitQ.year) : null,
      }),
    });
    if (!res.ok) {
      alert("Could not submit");
      return;
    }
    alert("Submitted for admin review.");
    setSubmitOpen(false);
    setSubmitQ((s) => ({ ...s, question: "", modelAnswer: "" }));
    void refreshCounts();
  };

  const practiceQuestions: PracticeQuestion[] = filteredQuestions.map((q) => ({
    id: q.id,
    question: q.question,
    answer: q.modelAnswer ?? "",
    category: q.category,
    difficulty: q.difficulty,
    sourceLabel: q.bankSource,
    keywords: [],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-2">
        <div>
        <h1 className="page-title">Mock Interview</h1>
          <p className="mt-1 text-sm text-[#888888]">
            <span className="text-[#f0f0f0]">SHARED</span> question bank ·{" "}
            <span className="text-[#c9a84c]">ACTIVE</span> practice flow
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {attemptedToday} questions attempted today · current streak {streak}
          </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={activeTab === "question-bank" ? "default" : "outline"}
            onClick={() => setActiveTab("question-bank")}
          >
            Question Practice
          </Button>
          <Button
            size="sm"
            variant={activeTab === "case-practice" ? "default" : "outline"}
            onClick={() => setActiveTab("case-practice")}
          >
            Case Practice
          </Button>
        </div>
        </div>
        {activeTab === "question-bank" ? (
          <Button size="sm" onClick={() => setSubmitOpen(true)}>
            Submit Question +
          </Button>
        ) : null}
      </div>
      {activeTab === "case-practice" ? (
        <ConsultingCasePractice />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <Card className="h-fit space-y-2 border-zinc-800 bg-zinc-900/50 p-3 text-sm">
            {relevantBanks.length > 0 ? (
              <div className="mb-2 rounded border border-zinc-800 bg-zinc-950/60 p-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Recommended for you</p>
                <div className="mt-1 space-y-1">
                  {relevantBanks.slice(0, 3).map((bank) => (
                    <button
                      key={`rec-${bank}`}
                      type="button"
                      onClick={() => setBankFilter(bank)}
                      className="flex w-full items-center justify-between rounded px-1.5 py-1 text-left text-xs text-zinc-300 hover:bg-zinc-800"
                    >
                      <span className="truncate">{bank}</span>
                      <span className="text-amber-300">★</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Banks</p>
            {MOCK_INTERVIEW_BANKS.map((b) => (
              <button
                key={b}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between rounded px-2 py-1.5 text-left hover:bg-zinc-800",
                  bankFilter === b && "bg-zinc-800",
                )}
                onClick={() => setBankFilter(b)}
              >
                <span className="truncate">{b}</span>
                <span className="text-xs text-zinc-500">{bankCounts[b] ?? 0}</span>
              </button>
            ))}
          </Card>
          <div className="space-y-4">
            <Card className="space-y-3 border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={mode === "practice" ? "default" : "outline"} onClick={() => setMode("practice")}>
                  Practice (untimed)
                </Button>
                <Button size="sm" variant={mode === "timed" ? "default" : "outline"} onClick={startTimed} disabled={loading}>
                  Timed (~20×90s)
                </Button>
                <Button
                  size="sm"
                  variant={mode === "bank-specific" ? "default" : "outline"}
                  onClick={() => {
                    setMode("bank-specific");
                    if (!bankFilter) alert("Select a bank first from the sidebar.");
                  }}
                >
                  Bank mode
                </Button>
              </div>
              <p className="text-xs text-zinc-500">
                Continue where you left off: {bankFilter ? `${bankFilter}` : "choose a bank from the left"}.
              </p>
            </Card>

            {recentQuestions.length > 0 ? (
              <Card className="space-y-2 border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-sm font-medium text-zinc-200">Recent</p>
                {recentQuestions.slice(0, 5).map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    className="block w-full rounded border border-zinc-800 bg-zinc-950/50 p-2 text-left text-xs text-zinc-300 hover:border-zinc-700"
                    onClick={() => {
                      if (!bankFilter) setBankFilter(q.bankSource);
                      openPractice(q.id);
                    }}
                  >
                    <span className="text-zinc-500">{q.bankSource}</span> · {q.question}
                  </button>
                ))}
              </Card>
            ) : null}

            <Card className="space-y-3 border-zinc-800 bg-zinc-900/50 p-4">
              <div className="grid gap-2 sm:grid-cols-5">
                <select
                  className="rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c === "all" ? "All categories" : c}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs"
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                >
                  {["all", "Easy", "Medium", "Hard"].map((d) => (
                    <option key={d} value={d}>
                      {d === "all" ? "All difficulty" : d}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y === "all" ? "All years" : y}
                    </option>
                  ))}
                </select>
                <Input
                  className="sm:col-span-2"
                  placeholder="Search questions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {filteredQuestions.length === 0 ? (
                <div className="rounded border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-400">
                  No questions yet for this firm. Be the first to submit one!
                  <div className="mt-2">
                    <Button size="sm" onClick={() => setSubmitOpen(true)}>
                      Submit Question +
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredQuestions.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded border border-zinc-800 bg-zinc-950/60 p-3 text-left hover:border-zinc-600",
                        relevantBanks.includes(q.bankSource) && "border-emerald-700/40 bg-emerald-950/10",
                      )}
                      onClick={() => openPractice(q.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-zinc-100">{q.question}</p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-400">
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5">{q.category}</span>
                          <span className="rounded border border-zinc-700 px-1.5 py-0.5">{q.difficulty}</span>
                          {q.year ? <span>{q.year}</span> : null}
                        </div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => openPractice(q.id)}>
                        Practice
                      </Button>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      <PracticeModal
        open={practiceOpen}
        title="Mock Interview Practice"
        questions={practiceQuestions}
        index={practiceIndex}
        onClose={() => setPracticeOpen(false)}
        onNavigate={setPracticeIndex}
        onMarkKnown={async (id) => {
          await logPracticeAttempt(id, "known");
        }}
        onMarkReview={async (id) => {
          await logPracticeAttempt(id, "review");
        }}
      />

      <Modal open={submitOpen} onClose={() => setSubmitOpen(false)} title="Submit mock interview question" className="max-w-2xl">
        <div className="space-y-2">
          <Input
            placeholder="Question"
            value={submitQ.question}
            onChange={(e) => setSubmitQ((s) => ({ ...s, question: e.target.value }))}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              className="rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
              value={submitQ.bankSource}
              onChange={(e) => setSubmitQ((s) => ({ ...s, bankSource: e.target.value }))}
            >
              {MOCK_INTERVIEW_BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <select
              className="rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
              value={submitQ.category}
              onChange={(e) => setSubmitQ((s) => ({ ...s, category: e.target.value }))}
            >
              {["Behavioral", "Technical", "Deal Discussion", "Consulting - Behavioral", "Consulting - Case Math"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
              value={submitQ.difficulty}
              onChange={(e) => setSubmitQ((s) => ({ ...s, difficulty: e.target.value }))}
            >
              {["Easy", "Medium", "Hard"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Input
              placeholder="Year"
              value={submitQ.year}
              onChange={(e) => setSubmitQ((s) => ({ ...s, year: e.target.value }))}
            />
          </div>
          <textarea
            className="min-h-[100px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm"
            placeholder="Model answer (optional)"
            value={submitQ.modelAnswer}
            onChange={(e) => setSubmitQ((s) => ({ ...s, modelAnswer: e.target.value }))}
          />
          <div className="flex justify-end">
            <Button size="sm" onClick={() => void submitQuestion()}>
              Submit for review
            </Button>
          </div>
        </div>
      </Modal>

      <PracticeModal
        open={timedOpen}
        title={`Timed Practice (${timedIndex + 1}/${Math.max(1, timedQueue.length)}) · ${secondsLeft}s`}
        questions={timedQueue.map((q) => ({
          id: q.id,
          question: q.question,
          answer: q.modelAnswer ?? "",
          category: q.category,
          difficulty: q.difficulty,
          sourceLabel: q.bankSource,
          keywords: [],
        }))}
        index={timedIndex}
        onClose={() => {
          setTimedOpen(false);
          void completeTimed();
        }}
        onNavigate={(nextIdx) => {
          setTimedIndex(nextIdx);
          setSecondsLeft(90);
        }}
        onMarkKnown={async (id) => {
          await logPracticeAttempt(id, "known");
        }}
        onMarkReview={async (id) => {
          await logPracticeAttempt(id, "review");
        }}
      />
    </div>
  );
}
