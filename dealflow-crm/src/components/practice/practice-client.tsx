"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { StatTile } from "@/components/ui/stat-tile";
import { DataTable, Td, Th } from "@/components/ui/data-table";
import { QuestionMcqDeck } from "@/components/question-mcq-deck";
import type { GradeResult, PublicMcq } from "@/lib/mcq/types";
import { cn } from "@/lib/utils";

export type PracticeLessonOption = {
  id: string;
  module: number;
  moduleTitle: string;
  title: string;
  count: number;
  attempted: number;
  accuracy: number | null;
};

type Mode = "mcq" | "flashcards";
type Difficulty = "all" | "Easy" | "Medium" | "Hard";
type Missed = { id: string; question: string; lessonId: string | null };

export function PracticeClient({
  lessons,
  initialLesson,
  initialModule,
  initialDifficulty,
}: {
  lessons: PracticeLessonOption[];
  initialLesson: string | null;
  initialModule: number | null;
  initialDifficulty: string | null;
}) {
  const router = useRouter();
  const startModule = initialLesson ? Number(initialLesson.split("-")[0]) : initialModule;
  const [mod, setMod] = useState<string>(startModule !== null ? String(startModule) : "all");
  const [lesson, setLesson] = useState<string>(initialLesson ?? "all");
  const [difficulty, setDifficulty] = useState<Difficulty>((initialDifficulty as Difficulty) ?? "all");
  const [size, setSize] = useState(10);
  const [mode, setMode] = useState<Mode>("mcq");
  const [questions, setQuestions] = useState<PublicMcq[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState({ answered: 0, correct: 0, points: 0, ms: 0 });
  const [missed, setMissed] = useState<Missed[]>([]);

  const modules = useMemo(() => {
    const m = new Map<number, { title: string; count: number }>();
    for (const l of lessons) {
      const cur = m.get(l.module) ?? { title: l.moduleTitle, count: 0 };
      cur.count += l.count;
      m.set(l.module, cur);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [lessons]);

  const lessonOptions = useMemo(() => (mod === "all" ? lessons : lessons.filter((l) => String(l.module) === mod)), [lessons, mod]);

  const available = useMemo(() => {
    if (lesson !== "all") return lessons.find((l) => l.id === lesson)?.count ?? 0;
    return lessonOptions.reduce((s, l) => s + l.count, 0);
  }, [lesson, lessons, lessonOptions]);

  const start = useCallback(
    async (overrides?: { lesson?: string; module?: string }) => {
      const l = overrides?.lesson ?? lesson;
      const m = overrides?.module ?? mod;
      setLoading(true);
      try {
        const qs = new URLSearchParams({ limit: String(size) });
        if (l !== "all") qs.set("lesson", l);
        else if (m !== "all") qs.set("module", m);
        if (difficulty !== "all") qs.set("difficulty", difficulty);
        const res = await fetch(`/api/mcq/practice?${qs}`);
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { questions: PublicMcq[] };
        if (!data.questions.length) {
          toast("No questions match those filters yet.");
          return;
        }
        setQuestions(data.questions);
        setStats({ answered: 0, correct: 0, points: 0, ms: 0 });
        setMissed([]);
        setDone(false);
        setSessionKey((k) => k + 1);
      } catch {
        toast.error("Couldn't load questions.");
      } finally {
        setLoading(false);
      }
    },
    [lesson, mod, size, difficulty],
  );

  // Arriving from a lesson's "Practice related questions" link starts right away.
  useEffect(() => {
    if (initialLesson) void start({ lesson: initialLesson });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onAnswered = useCallback((q: PublicMcq, r: GradeResult, ms: number) => {
    setStats((s) => ({ answered: s.answered + 1, correct: s.correct + (r.correct ? 1 : 0), points: s.points + r.xpAwarded, ms: s.ms + ms }));
    if (!r.correct) setMissed((m) => [...m, { id: q.id, question: q.question, lessonId: q.lessonId }]);
  }, []);

  const endSession = () => {
    setQuestions(null);
    setDone(false);
    router.refresh();
  };

  const avgSec = stats.answered ? Math.round(stats.ms / stats.answered / 1000) : null;

  const sessionPanel = (
    <Card title="This session" className="h-fit lg:w-72 lg:shrink-0">
      <div className="grid grid-cols-2 gap-4">
        <StatTile value={stats.correct} label="correct" />
        <StatTile value={stats.answered - stats.correct} label="missed" />
        <StatTile value={avgSec === null ? "—" : `${avgSec}s`} label="average time" />
        <StatTile value={stats.points} label="points earned" />
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-ink-3">
        Missed questions come back in your daily set after 1, 3 and 7 days. Points: +10 the first time you get a question right.
      </p>
      {missed.length ? (
        <div className="mt-4 border-t border-divider pt-3">
          <p className="eyebrow mb-2">Missed</p>
          <ul className="space-y-2">
            {missed.map((m) => (
              <li key={m.id} className="text-[13px] text-ink-2">
                <span className="line-clamp-2">{m.question}</span>
                {m.lessonId ? (
                  <Link href={`/learn/${m.lessonId}`} className="text-accent hover:underline">
                    Lesson {m.lessonId.replace("-", ".")}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );

  const controls = (
    <div className="flex flex-wrap items-end gap-3">
      <label className="space-y-1">
        <span className="eyebrow block">Module</span>
        <Select
          value={mod}
          onChange={(e) => {
            setMod(e.target.value);
            setLesson("all");
          }}
          className="w-56"
        >
          <option value="all">All modules</option>
          {modules.map(([m, info]) => (
            <option key={m} value={m}>
              {m}. {info.title}
            </option>
          ))}
        </Select>
      </label>
      <label className="space-y-1">
        <span className="eyebrow block">Lesson</span>
        <Select value={lesson} onChange={(e) => setLesson(e.target.value)} className="w-56">
          <option value="all">All lessons</option>
          {lessonOptions.map((l) => (
            <option key={l.id} value={l.id}>
              {l.id.replace("-", ".")} {l.title}
            </option>
          ))}
        </Select>
      </label>
      <div className="space-y-1">
        <span className="eyebrow block">Difficulty</span>
        <SegmentedControl<Difficulty>
          ariaLabel="Difficulty"
          value={difficulty}
          onChange={setDifficulty}
          options={[
            { value: "all", label: "All" },
            { value: "Easy", label: "Easy" },
            { value: "Medium", label: "Medium" },
            { value: "Hard", label: "Hard" },
          ]}
        />
      </div>
      <div className="space-y-1">
        <span className="eyebrow block">Mode</span>
        <SegmentedControl<Mode>
          ariaLabel="Mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: "mcq", label: "Multiple choice" },
            { value: "flashcards", label: "Flashcards" },
          ]}
        />
      </div>
    </div>
  );

  if (questions) {
    return (
      <div className="space-y-6">
        <PageHeader
          crumbs={[{ label: "Practice", href: "/practice" }, { label: lesson !== "all" ? `Lesson ${lesson.replace("-", ".")}` : "Session" }]}
          title="Practice"
          actions={
            <Button variant="secondary" onClick={endSession}>
              Change filters
            </Button>
          }
        />
        {done ? (
          <Card className="max-w-[820px] p-6">
            <p className="eyebrow">Session complete</p>
            {mode === "mcq" ? (
              <div className="mt-4 grid grid-cols-3 gap-4">
                <StatTile value={`${stats.correct}/${stats.answered}`} label="correct" />
                <StatTile value={avgSec === null ? "—" : `${avgSec}s`} label="average time" />
                <StatTile value={stats.points} label="points earned" />
              </div>
            ) : (
              <p className="mt-2 text-sm text-ink-2">Flashcards aren&apos;t scored. Switch to multiple choice to earn points.</p>
            )}
            <div className="mt-6 flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => void start()}>
                Another set
              </Button>
              <Button variant="secondary" onClick={endSession}>
                Change filters
              </Button>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div className="min-w-0 flex-1">
              {mode === "mcq" ? (
                <QuestionMcqDeck
                  key={sessionKey}
                  questions={questions}
                  context="practice"
                  onAnswered={onAnswered}
                  onComplete={() => setDone(true)}
                  onExit={endSession}
                />
              ) : (
                <FlashcardDeck key={sessionKey} questions={questions} onComplete={() => setDone(true)} onExit={endSession} />
              )}
            </div>
            {mode === "mcq" ? sessionPanel : null}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Practice"
        subtitle="The PE@Broad question bank. Every question is tied to a lesson."
        actions={
          <Button variant="primary" disabled={loading || available === 0} onClick={() => void start()}>
            {loading ? "Loading…" : `Start ${Math.min(size, available)} questions`}
          </Button>
        }
      />
      <Card className="p-5">
        {controls}
        <div className="mt-4 flex items-center gap-2 text-[13px] text-ink-3">
          <span>Questions per session</span>
          <Select value={size} onChange={(e) => setSize(Number(e.target.value))} className="h-8 w-20" aria-label="Questions per session">
            {[5, 10, 20, 40].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="section-title">By lesson</h2>
        {lessons.length === 0 ? (
          <p className="text-sm text-ink-3">No questions loaded yet. An admin needs to load the question bank.</p>
        ) : (
          <DataTable minWidth={520}>
            <thead>
              <tr>
                <Th>Lesson</Th>
                <Th className="text-right">Questions</Th>
                <Th className="text-right">Accuracy</Th>
                <Th className="w-28" />
              </tr>
            </thead>
            <tbody>
              {lessonOptions.map((l) => (
                <tr key={l.id}>
                  <Td>
                    <span className="mr-2 text-ink-3">{l.id.replace("-", ".")}</span>
                    {l.title}
                  </Td>
                  <Td className="text-right text-ink-2">{l.count}</Td>
                  <Td
                    className={cn(
                      "text-right",
                      l.accuracy === null ? "text-ink-3" : l.accuracy >= 80 ? "text-success" : l.accuracy >= 50 ? "text-ink-2" : "text-danger",
                    )}
                  >
                    {l.accuracy === null ? "—" : `${l.accuracy}%`}
                  </Td>
                  <Td className="text-right">
                    <button
                      type="button"
                      className="text-[13px] font-medium text-accent hover:underline"
                      onClick={() => {
                        setMod(String(l.module));
                        setLesson(l.id);
                        void start({ lesson: l.id, module: String(l.module) });
                      }}
                    >
                      Practice
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </section>
    </div>
  );
}

function FlashcardDeck({ questions, onComplete, onExit }: { questions: PublicMcq[]; onComplete: () => void; onExit: () => void }) {
  const [index, setIndex] = useState(0);
  const [reveal, setReveal] = useState<{ answer: string; explanation: string | null; lessonId: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const current = questions[index];

  const flip = useCallback(async () => {
    if (reveal || loading || !current) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/mcq/reveal?id=${encodeURIComponent(current.id)}`);
      if (!res.ok) throw new Error();
      setReveal(await res.json());
    } catch {
      toast.error("Couldn't load the answer.");
    } finally {
      setLoading(false);
    }
  }, [reveal, loading, current]);

  const next = useCallback(() => {
    if (index + 1 >= questions.length) onComplete();
    else {
      setIndex(index + 1);
      setReveal(null);
    }
  }, [index, questions.length, onComplete]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(t.tagName)) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (reveal) next();
        else void flip();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [reveal, next, flip]);

  if (!current) return null;
  return (
    <section className="w-full max-w-[820px] rounded-[var(--radius-lg)] border border-border bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between text-[13px] text-ink-3">
        <span>
          Card {index + 1} of {questions.length}
          {current.lessonId ? ` · Lesson ${current.lessonId.replace("-", ".")}` : ""} · {current.difficulty}
        </span>
        <button type="button" onClick={onExit} className="hover:text-ink hover:underline">
          End session
        </button>
      </div>
      <h2 className="mt-5 whitespace-pre-wrap text-[19px] font-medium leading-snug text-ink">{current.question}</h2>
      {reveal ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-[var(--radius)] border border-border bg-surface-2 p-4">
            <p className="eyebrow">Answer</p>
            <p className="mt-1 text-[15px] text-ink">{reveal.answer}</p>
            {reveal.explanation ? <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{reveal.explanation}</p> : null}
            {reveal.lessonId ? (
              <Link href={`/learn/${reveal.lessonId}`} target="_blank" className="mt-2 inline-block text-sm font-medium text-accent hover:underline">
                Review lesson {reveal.lessonId.replace("-", ".")}
              </Link>
            ) : null}
          </div>
          <div className="flex justify-end">
            <Button variant="primary" onClick={next} autoFocus>
              {index + 1 >= questions.length ? "Finish" : "Next card"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex items-center justify-between gap-3">
          <span className="text-[13px] text-ink-3">Say your answer out loud, then flip.</span>
          <Button variant="primary" onClick={() => void flip()} disabled={loading}>
            {loading ? "Loading…" : "Show answer"}
          </Button>
        </div>
      )}
    </section>
  );
}
