"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { Block, BlockOf, Lesson } from "@/lib/learn/schema";
import { isGraded } from "@/lib/learn/schema";
import type { BlockState, BlockStateMap, LessonEvent } from "@/lib/learn/progress-server";
import { recordLessonEvent } from "@/app/learn/actions";
import { cn } from "@/lib/utils";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
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
const DIFF_TONE: Record<Lesson["difficulty"], BadgeTone> = { core: "accent", "follow-up": "warn", advanced: "info" };

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
  prev = null,
  practiceCount = 0,
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
  prev?: { id: string; title: string } | null;
  /** MCQs in the question bank tagged to this lesson. */
  practiceCount?: number;
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

  // "On this page": which block is on screen right now.
  const [currentId, setCurrentId] = useState<string | null>(null);
  useEffect(() => {
    const els = lesson.blocks.map((b) => document.getElementById(b.id)).filter((e): e is HTMLElement => Boolean(e));
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top);
        if (visible[0]) setCurrentId(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [lesson.blocks]);

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

  const outline = (
    <ol className="space-y-0.5">
      {lesson.blocks.map((b) => {
        const st = stateMap[b.id];
        const done = tracked(b) ? st?.done : b.type === "deepDive" ? st?.opened : undefined;
        const isCurrent = currentId === b.id;
        return (
          <li key={b.id}>
            <a
              href={`#${b.id}`}
              aria-current={isCurrent ? "location" : undefined}
              className={cn(
                "flex items-start gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-[13px] leading-snug",
                isCurrent ? "bg-accent-tint font-medium text-accent" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "mt-1 h-2 w-2 shrink-0 rounded-full border",
                  done ? "border-success bg-success" : isCurrent ? "border-accent bg-accent" : "border-border-strong",
                )}
              />
              <span className="sr-only">{done ? "Done: " : isCurrent ? "Current: " : "Not started: "}</span>
              <span className="min-w-0">{blockLabel(b)}</span>
            </a>
          </li>
        );
      })}
    </ol>
  );

  const progressLabel = `${doneCount} of ${trackedBlocks.length} checks`;
  const askMentor = () => document.getElementById("ask")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <LessonContext.Provider value={ctx}>
      <div className="space-y-6">
        <PageHeader
          crumbs={[
            { label: "Lessons", href: "/learn" },
            { label: `Module ${lesson.module} · ${lesson.moduleTitle}`, href: `/learn#module-${lesson.module}` },
            { label: lesson.id.replace("-", ".") },
          ]}
          title={lesson.title}
          subtitle={
            <span className="flex flex-wrap items-center gap-2">
              <Badge tone={DIFF_TONE[lesson.difficulty]}>{DIFF_LABEL[lesson.difficulty]}</Badge>
              <span>About {lesson.estMinutes} min</span>
              {status === "completed" ? <span className="text-success">Completed · score {score}%</span> : null}
            </span>
          }
          actions={
            <Button variant="secondary" onClick={askMentor}>
              Ask about this lesson
            </Button>
          }
        />

        {/* Phones and tablets: the outline collapses into a button at the top. */}
        <details className="rounded-[var(--radius-lg)] border border-border bg-surface xl:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
            On this page
            <span className="text-[13px] font-normal text-ink-3">{progressLabel}</span>
          </summary>
          <div className="border-t border-divider p-2">{outline}</div>
        </details>

        <div className="flex gap-10">
          <article className="min-w-0 max-w-[780px] flex-1 space-y-4 pb-16">
            {lesson.objectives.length ? (
              <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
                <p className="eyebrow mb-2">By the end you can</p>
                <ul className="lesson-prose list-disc space-y-1 pl-5 text-ink">
                  {lesson.objectives.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {lesson.blocks.map((b, i) => (
              <div key={b.id} className="space-y-4">
                {i === insertAt
                  ? faqs.map((f) => (
                      <section key={f.id} id={f.id} className="scroll-mt-20">
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
              <div className="rounded-[var(--radius-lg)] border border-success bg-success-bg p-5 text-sm text-ink">
                <p className="font-semibold text-success">Lesson complete · score {score}%</p>
                <p className="mt-1 text-ink-2">
                  Answer keys for this lesson&apos;s workbook are unlocked. Anything you marked &ldquo;Shaky&rdquo; is on your review list.
                </p>
              </div>
            ) : null}

            <nav aria-label="Lesson navigation" className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              {prev ? (
                <Button variant="secondary" asChild>
                  <Link href={`/learn/${prev.id}`}>Previous: {prev.title}</Link>
                </Button>
              ) : (
                <span />
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                {practiceCount > 0 ? (
                  <Button variant={next ? "secondary" : "primary"} asChild>
                    <Link href={`/practice?lesson=${lesson.id}`}>
                      Practice {practiceCount} related question{practiceCount === 1 ? "" : "s"}
                    </Link>
                  </Button>
                ) : null}
                {next ? (
                  <Button variant="primary" asChild>
                    <Link href={`/learn/${next.id}`}>Next: {next.title}</Link>
                  </Button>
                ) : null}
              </div>
            </nav>
            <div id="ask" className="scroll-mt-20">
              {footer}
            </div>
          </article>

          <aside className="sticky top-8 hidden h-fit w-64 shrink-0 space-y-4 xl:block">
            <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
              <p className="eyebrow mb-2">On this page</p>
              <ProgressBar value={doneCount} max={trackedBlocks.length || 1} size="sm" label={progressLabel} className="mb-3" />
              <div className="max-h-[55vh] overflow-y-auto">{outline}</div>
            </div>
            <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
              <p className="text-sm font-semibold text-ink">Still stuck?</p>
              <p className="mt-1 text-[13px] text-ink-2">Ask the AI tutor, or send the question to a PE@Broad mentor.</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={askMentor}>
                Ask a mentor
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </LessonContext.Provider>
  );
}
