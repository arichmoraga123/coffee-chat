"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Block, BlockOf, Lesson } from "@/lib/learn/schema";
import { isGraded } from "@/lib/learn/schema";
import type { BlockState, BlockStateMap, LessonEvent } from "@/lib/learn/progress-server";
import { recordLessonEvent } from "@/app/learn/actions";
import { cn } from "@/lib/utils";
import { LessonContext, type LessonCtx, type ResourceInfo } from "./lesson-context";
import {
  CheckpointView,
  DeepDiveView,
  ExcelLinkView,
  FormulaBlockView,
  StepThroughView,
  TextBlockView,
} from "./blocks/simple-blocks";
import { CalcView, FillBlankView, McqView, OrderStepsView } from "./blocks/graded-blocks";

const DIFF_LABEL: Record<Lesson["difficulty"], string> = { core: "Core", "follow-up": "Follow-up", advanced: "Advanced" };

function blockLabel(b: Block): string {
  switch (b.type) {
    case "text": {
      const h = /^#{1,3}\s+(.+)$/m.exec(b.body);
      if (h) return h[1];
      const words = b.body.replace(/[*_#>`]/g, "").split(/\s+/).slice(0, 6).join(" ");
      return `${words}…`;
    }
    case "formula":
      return b.caption ?? "Formula";
    case "stepThrough":
      return b.title ?? "Walk through it";
    case "fillBlank":
      return "Fill in the blank";
    case "calc":
      return "Calculate";
    case "mcq":
      return "Multiple choice";
    case "deepDive":
      return b.title;
    case "orderSteps":
      return "Put in order";
    case "checkpoint":
      return b.title ?? "Say it out loud";
    case "excelLink":
      return "Workbook";
  }
}

function tracked(b: Block): boolean {
  return isGraded(b) || b.type === "stepThrough" || b.type === "checkpoint";
}

export function LessonPlayer({
  lesson,
  initialState,
  initialStatus,
  initialScore,
  seed,
  isAdmin,
  resources,
  faqs,
  next,
  footer,
}: {
  lesson: Lesson;
  initialState: BlockStateMap;
  initialStatus: "in_progress" | "completed" | null;
  initialScore: number;
  seed: string;
  isAdmin: boolean;
  resources: Record<string, ResourceInfo>;
  /** Mentor answers promoted to FAQs, shown as extra deep dives. */
  faqs: BlockOf<"deepDive">[];
  next: { id: string; title: string } | null;
  footer?: ReactNode;
}) {
  const [stateMap, setStateMap] = useState<BlockStateMap>(initialState);
  const [status, setStatus] = useState(initialStatus ?? "in_progress");
  const [score, setScore] = useState(initialScore);
  const [openDives, setOpenDives] = useState<Record<string, boolean>>({});
  const stateRef = useRef(stateMap);
  useEffect(() => {
    stateRef.current = stateMap;
  }, [stateMap]);

  const send = useCallback(
    async (blockId: string, event: LessonEvent) => {
      try {
        const res = await recordLessonEvent(lesson.id, blockId, event);
        if (!res.ok) {
          if (res.error) toast.error(res.error);
          return res;
        }
        if (res.state) setStateMap((m) => ({ ...m, [blockId]: res.state as BlockState }));
        setScore(res.score);
        setStatus(res.lessonStatus);
        if (res.justCompleted) toast.success(`Lesson complete! +${res.xpGained} XP`, { duration: 5000 });
        else if (res.xpGained > 0) toast.success(`+${res.xpGained} XP`, { duration: 1500 });
        return res;
      } catch {
        toast.error("Couldn't save your progress — check your connection.");
        return null;
      }
    },
    [lesson.id],
  );

  const ctx: LessonCtx = useMemo(
    () => ({
      lessonId: lesson.id,
      seed,
      isAdmin,
      completed: status === "completed",
      resources,
      state: (id: string) => stateMap[id] ?? {},
      send,
    }),
    [lesson.id, seed, isAdmin, status, resources, stateMap, send],
  );

  const toggleDive = useCallback(
    (id: string, open: boolean) => {
      setOpenDives((o) => ({ ...o, [id]: open }));
      if (open && !stateRef.current[id]?.opened && lesson.blocks.some((b) => b.id === id)) {
        void send(id, { kind: "opened" });
      }
    },
    [lesson.blocks, send],
  );

  // Deep links: /learn/5-2#b9 opens that deep dive and scrolls to it.
  useEffect(() => {
    const openFromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const isDive = lesson.blocks.some((b) => b.id === id && b.type === "deepDive") || faqs.some((f) => f.id === id);
      if (isDive) toggleDive(id, true);
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [lesson.blocks, faqs, toggleDive]);

  const trackedBlocks = lesson.blocks.filter(tracked);
  const doneCount = trackedBlocks.filter((b) => stateMap[b.id]?.done).length;
  const pct = trackedBlocks.length ? Math.round((doneCount / trackedBlocks.length) * 100) : 0;

  const render = (b: Block) => {
    switch (b.type) {
      case "text":
        return <TextBlockView block={b} />;
      case "formula":
        return <FormulaBlockView block={b} />;
      case "stepThrough":
        return <StepThroughView block={b} />;
      case "fillBlank":
        return <FillBlankView block={b} />;
      case "calc":
        return <CalcView block={b} />;
      case "mcq":
        return <McqView block={b} />;
      case "deepDive":
        return <DeepDiveView block={b} open={Boolean(openDives[b.id])} onToggle={(o) => toggleDive(b.id, o)} />;
      case "orderSteps":
        return <OrderStepsView block={b} />;
      case "checkpoint":
        return <CheckpointView block={b} />;
      case "excelLink":
        return <ExcelLinkView block={b} />;
    }
  };

  // FAQs go right before the checkpoint (or at the end).
  const checkpointIndex = lesson.blocks.findIndex((b) => b.type === "checkpoint");
  const insertAt = checkpointIndex >= 0 ? checkpointIndex : lesson.blocks.length;

  return (
    <LessonContext.Provider value={ctx}>
      <div className="-mx-4 -mt-4 md:-mx-6 md:-mt-6">
        <div className="sticky top-12 z-20 border-b border-white/10 bg-zinc-950/95 px-4 py-2 backdrop-blur md:top-0 md:px-6">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <Link href="/learn" className="shrink-0 text-xs text-zinc-400 hover:text-zinc-100">
              ← Learn
            </Link>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800" aria-label={`Lesson progress ${pct}%`}>
              <div className="h-full rounded-full bg-[#4a6fa5] transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="shrink-0 font-mono text-xs text-zinc-400">
              {doneCount}/{trackedBlocks.length}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-4 flex max-w-5xl gap-8">
        <nav aria-label="Lesson outline" className="sticky top-16 hidden h-fit max-h-[80vh] w-56 shrink-0 overflow-y-auto lg:block">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">In this lesson</p>
          <ol className="space-y-0.5">
            {lesson.blocks.map((b) => {
              const st = stateMap[b.id];
              const done = tracked(b) ? st?.done : b.type === "deepDive" ? st?.opened : undefined;
              return (
                <li key={b.id}>
                  <a
                    href={`#${b.id}`}
                    className={cn(
                      "flex items-start gap-2 rounded px-2 py-1 text-xs leading-snug hover:bg-zinc-900",
                      b.type === "deepDive" ? "text-zinc-400" : "text-zinc-300",
                    )}
                  >
                    <span className={cn("mt-px w-3 shrink-0", done ? "text-emerald-400" : "text-zinc-700")} aria-hidden>
                      {done ? "✓" : tracked(b) ? "○" : "·"}
                    </span>
                    <span className="line-clamp-2">{blockLabel(b)}</span>
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>

        <article className="min-w-0 flex-1 space-y-5 pb-16">
          <header className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a8c0e6]">
              Module {lesson.module} · {lesson.moduleTitle} · Lesson {lesson.id.replace("-", ".")}
            </p>
            <h1 className="text-2xl font-semibold text-zinc-50 sm:text-3xl">{lesson.title}</h1>
            <p className="text-sm text-zinc-400">
              {DIFF_LABEL[lesson.difficulty]} · ~{lesson.estMinutes} min
              {status === "completed" ? <span className="ml-2 text-emerald-400">· Completed · score {score}%</span> : null}
            </p>
            {lesson.objectives.length ? (
              <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">By the end you can</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-300">
                  {lesson.objectives.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </header>

          {lesson.blocks.map((b, i) => (
            <div key={b.id}>
              {i === insertAt
                ? faqs.map((f) => (
                    <section key={f.id} id={f.id} className="mb-5 scroll-mt-20">
                      <DeepDiveView block={f} faq open={Boolean(openDives[f.id])} onToggle={(o) => toggleDive(f.id, o)} />
                    </section>
                  ))
                : null}
              <section id={b.id} className="scroll-mt-20">
                {render(b)}
              </section>
            </div>
          ))}
          {insertAt === lesson.blocks.length
            ? faqs.map((f) => (
                <section key={f.id} id={f.id} className="scroll-mt-20">
                  <DeepDiveView block={f} faq open={Boolean(openDives[f.id])} onToggle={(o) => toggleDive(f.id, o)} />
                </section>
              ))
            : null}

          {status === "completed" ? (
            <div className="rounded-xl border border-emerald-600/50 bg-emerald-950/30 p-4 text-sm text-emerald-100">
              <p className="font-semibold">Lesson complete — score {score}%.</p>
              <p className="mt-1 text-emerald-200/80">
                Answer keys for this lesson&apos;s workbook are unlocked. Anything you marked &ldquo;Shaky&rdquo; is on your review list.
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            {lesson.relatedQuestionTags.length ? (
              <Link
                href={`/questions?tags=${encodeURIComponent(lesson.relatedQuestionTags.join(","))}`}
                className="rounded-lg border border-white/15 px-4 py-2.5 text-center text-sm font-medium text-zinc-100 hover:border-[#4a6fa5]"
              >
                Drill related questions
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/learn/${next.id}`}
                className="rounded-lg bg-[#4a6fa5] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#5a7fb5]"
              >
                Next: {next.title} →
              </Link>
            ) : null}
          </div>
          {footer}
        </article>
      </div>
    </LessonContext.Provider>
  );
}
