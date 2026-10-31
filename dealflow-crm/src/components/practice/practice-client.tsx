"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
type Missed = { id: string; question: string; lessonId: string | null };

const SELECT = "w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100";

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
  const [difficulty, setDifficulty] = useState<string>(initialDifficulty ?? "all");
  const [size, setSize] = useState(10);
  const [mode, setMode] = useState<Mode>("mcq");
  const [questions, setQuestions] = useState<PublicMcq[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState({ answered: 0, correct: 0, xp: 0 });
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

  const lessonOptions = useMemo(
    () => (mod === "all" ? lessons : lessons.filter((l) => String(l.module) === mod)),
    [lessons, mod],
  );

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
          toast.message("No questions match those filters yet.");
          return;
        }
        setQuestions(data.questions);
        setStats({ answered: 0, correct: 0, xp: 0 });
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

  const onAnswered = useCallback((q: PublicMcq, r: GradeResult) => {
    setStats((s) => ({ answered: s.answered + 1, correct: s.correct + (r.correct ? 1 : 0), xp: s.xp + r.xpAwarded }));
    if (!r.correct) setMissed((m) => [...m, { id: q.id, question: q.question, lessonId: q.lessonId }]);
  }, []);

  const endSession = () => {
    setQuestions(null);
    setDone(false);
    router.refresh();
  };

  const accuracy = stats.answered ? Math.round((stats.correct / stats.answered) * 100) : null;

  const sessionPanel = (
    <aside className="space-y-3 rounded-xl border border-white/10 bg-zinc-900/60 p-4 text-sm lg:w-64 lg:shrink-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">This session</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="font-mono text-lg text-zinc-100">{stats.answered}</p>
          <p className="text-[11px] text-zinc-500">answered</p>
        </div>
        <div>
          <p className="font-mono text-lg text-emerald-300">{accuracy === null ? "—" : `${accuracy}%`}</p>
          <p className="text-[11px] text-zinc-500">accuracy</p>
        </div>
        <div>
          <p className="font-mono text-lg text-[#c9a84c]">+{stats.xp}</p>
          <p className="text-[11px] text-zinc-500">XP</p>
        </div>
      </div>
      {missed.length ? (
        <div>
          <p className="mb-1 text-xs font-semibold text-zinc-400">Missed — these come back in your daily drill</p>
          <ul className="space-y-1.5">
            {missed.map((m) => (
              <li key={m.id} className="text-xs text-zinc-400">
                <span className="line-clamp-2">{m.question}</span>
                {m.lessonId ? (
                  <Link href={`/learn/${m.lessonId}`} className="text-[#a8c0e6] hover:underline">
                    Lesson {m.lessonId.replace("-", ".")}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">XP: +10 the first time you get a question right.</p>
      )}
    </aside>
  );

  if (questions) {
    return (
      <div className="mx-auto max-w-6xl">
        {done ? (
          <div className="mx-auto flex max-w-lg flex-col items-center py-12 text-center">
            <h2 className="text-2xl font-semibold text-zinc-50">Session complete</h2>
            {mode === "mcq" ? (
              <p className="mt-3 text-lg text-zinc-200">
                {stats.correct}/{stats.answered} correct · +{stats.xp} XP
              </p>
            ) : (
              <p className="mt-3 text-zinc-400">Flashcards don&apos;t count toward XP — switch to MCQ to get scored.</p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button onClick={() => void start()}>Another set</Button>
              <Button variant="outline" onClick={endSession}>
                Change filters
              </Button>
            </div>
            {missed.length ? <div className="mt-8 w-full text-left">{sessionPanel}</div> : null}
          </div>
        ) : (
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex min-h-[70vh] min-w-0 flex-1 flex-col">
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
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="page-title">Practice</h1>
        <p className="mt-1 text-sm text-zinc-400">
          The PE@Broad question bank — every question is tied to a Learn lesson. Pick a module or lesson, or just hit
          start.
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border border-white/10 bg-zinc-900/50 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="space-y-1 text-xs text-zinc-500">
          Module
          <select
            className={SELECT}
            value={mod}
            onChange={(e) => {
              setMod(e.target.value);
              setLesson("all");
            }}
          >
            <option value="all">All modules</option>
            {modules.map(([m, info]) => (
              <option key={m} value={m}>
                {m}. {info.title} ({info.count})
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-zinc-500">
          Lesson
          <select className={SELECT} value={lesson} onChange={(e) => setLesson(e.target.value)}>
            <option value="all">All lessons</option>
            {lessonOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id.replace("-", ".")} {l.title} ({l.count})
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-zinc-500">
          Difficulty
          <select className={SELECT} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="all">Any</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </label>
        <label className="space-y-1 text-xs text-zinc-500">
          Questions
          <select className={SELECT} value={size} onChange={(e) => setSize(Number(e.target.value))}>
            {[5, 10, 20, 40].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-1 text-xs text-zinc-500">
          Mode
          <div className="flex overflow-hidden rounded-lg border border-white/10">
            {(["mcq", "flashcards"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 px-2 py-2 text-sm",
                  mode === m ? "bg-[#4a6fa5] text-white" : "bg-zinc-950 text-zinc-300 hover:bg-zinc-900",
                )}
              >
                {m === "mcq" ? "MCQ" : "Flashcards"}
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2 lg:col-span-5">
          <Button variant="cta" className="w-full sm:w-auto" disabled={loading || available === 0} onClick={() => void start()}>
            {loading ? "Loading…" : `Start ${Math.min(size, available)} questions`}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-white/10">
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          <span>Lesson</span>
          <span className="text-right">Questions</span>
          <span className="w-20 text-right">Accuracy</span>
        </div>
        {lessons.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-500">No questions loaded yet — an admin needs to run the question seed.</p>
        ) : (
          lessons.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setMod(String(l.module));
                setLesson(l.id);
                void start({ lesson: l.id, module: String(l.module) });
              }}
              className="grid w-full grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-white/5 px-4 py-2 text-left text-sm last:border-0 hover:bg-zinc-900/60"
            >
              <span className="min-w-0 truncate text-zinc-200">
                <span className="mr-2 font-mono text-xs text-zinc-500">{l.id.replace("-", ".")}</span>
                {l.title}
              </span>
              <span className="text-right font-mono text-xs text-zinc-400">{l.count}</span>
              <span
                className={cn(
                  "w-20 text-right font-mono text-xs",
                  l.accuracy === null
                    ? "text-zinc-600"
                    : l.accuracy >= 80
                      ? "text-emerald-300"
                      : l.accuracy >= 50
                        ? "text-amber-300"
                        : "text-red-300",
                )}
              >
                {l.accuracy === null ? "—" : `${l.accuracy}%`}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function FlashcardDeck({
  questions,
  onComplete,
  onExit,
}: {
  questions: PublicMcq[];
  onComplete: () => void;
  onExit: () => void;
}) {
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
    <div className="flex flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between text-sm text-zinc-400">
        <span>
          Card {index + 1} of {questions.length}
        </span>
        <Button size="sm" variant="outline" onClick={onExit}>
          Exit
        </Button>
      </div>
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <button
          type="button"
          onClick={() => void flip()}
          className="w-full rounded-xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 text-left"
        >
          <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
            {current.category}
            {current.lessonId ? ` · Lesson ${current.lessonId.replace("-", ".")}` : ""} · {current.difficulty}
          </p>
          <p className="whitespace-pre-wrap text-lg font-medium leading-relaxed text-zinc-100">{current.question}</p>
          {!reveal ? (
            <p className="mt-6 text-xs text-zinc-500">{loading ? "Loading…" : "Say your answer out loud, then tap (or press Space) to flip"}</p>
          ) : null}
        </button>
        {reveal ? (
          <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-5 text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Answer</p>
            <p className="text-base text-zinc-100">{reveal.answer}</p>
            {reveal.explanation ? <p className="mt-3 whitespace-pre-wrap leading-relaxed text-zinc-300">{reveal.explanation}</p> : null}
            <div className="mt-4 flex items-center justify-between">
              {reveal.lessonId ? (
                <Link href={`/learn/${reveal.lessonId}`} target="_blank" className="text-xs text-[#a8c0e6] hover:underline">
                  Review lesson {reveal.lessonId.replace("-", ".")} ↗
                </Link>
              ) : (
                <span />
              )}
              <Button onClick={next} autoFocus>
                {index + 1 >= questions.length ? "Finish" : "Next card →"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
