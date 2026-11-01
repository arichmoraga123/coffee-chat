"use client";

import { useMemo, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import type { BlockOf } from "@/lib/learn/schema";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Markdown } from "../markdown";
import { useLesson } from "../lesson-context";

function Tex({ latex, display = false }: { latex: string; display?: boolean }) {
  const html = useMemo(
    () => katex.renderToString(latex, { displayMode: display, throwOnError: false, strict: "ignore" }),
    [latex, display],
  );
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function TextBlockView({ block }: { block: BlockOf<"text"> }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
      <Markdown className="lesson-prose">{block.body}</Markdown>
    </div>
  );
}

export function FormulaBlockView({ block }: { block: BlockOf<"formula"> }) {
  const [active, setActive] = useState<number | null>(null);
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface-2 p-6">
      <div className="overflow-x-auto py-1 text-lg text-ink sm:text-xl">
        <Tex latex={block.latex} display />
      </div>
      {block.caption ? <p className="mt-1 text-center text-xs text-ink-2">{block.caption}</p> : null}
      {block.legend.length ? (
        <ul className="mt-3 divide-y divide-divider rounded-lg border border-border bg-surface">
          {block.legend.map((row, i) => (
            <li key={row.symbol}>
              <button
                type="button"
                aria-pressed={active === i}
                onClick={() => setActive(active === i ? null : i)}
                className={cn(
                  "flex w-full items-baseline gap-3 px-3 py-2 text-left text-sm transition-colors",
                  active === i ? "bg-accent-tint text-ink" : "text-ink-2 hover:bg-surface",
                )}
              >
                <span className="w-24 shrink-0 text-ink">
                  <Tex latex={row.symbol} />
                </span>
                <span>{row.meaning}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function StepThroughView({ block }: { block: BlockOf<"stepThrough"> }) {
  const { state, send } = useLesson();
  const saved = state(block.id);
  const [i, setI] = useState(saved.done ? block.steps.length - 1 : (saved.step ?? 0));
  const step = block.steps[i];
  const last = i === block.steps.length - 1;

  const go = (next: number) => {
    setI(next);
    if (next > (saved.step ?? 0) || (next === block.steps.length - 1 && !saved.done)) {
      void send(block.id, { kind: "step", index: next });
    }
  };

  // Mark single-step blocks as seen on first render of the step.
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">{block.title ?? "Walk through it"}</p>
        <span className="font-mono text-xs text-ink-3">
          {i + 1}/{block.steps.length}
          {saved.done ? <span className="ml-2 text-success">✓</span> : null}
        </span>
      </div>
      <div className="min-h-[72px]" aria-live="polite">
        {step.heading ? <p className="mb-1 font-semibold text-ink">{step.heading}</p> : null}
        <Markdown>{step.body}</Markdown>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Button type="button" size="sm" variant="outline" disabled={i === 0} onClick={() => go(i - 1)}>
          ← Back
        </Button>
        <div className="flex gap-1" aria-hidden>
          {block.steps.map((_, k) => (
            <span key={k} className={cn("h-1.5 w-4 rounded-full", k <= i ? "bg-accent" : "bg-border-strong")} />
          ))}
        </div>
        {last ? (
          <Button
            type="button"
            size="sm"
            disabled={saved.done}
            onClick={() => void send(block.id, { kind: "step", index: block.steps.length - 1 })}
          >
            {saved.done ? "Done ✓" : "Done"}
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={() => go(i + 1)}>
            Next →
          </Button>
        )}
      </div>
    </div>
  );
}

const DIFF_BADGE: Record<BlockOf<"deepDive">["difficulty"], { label: string; tone: BadgeTone }> = {
  core: { label: "Core", tone: "accent" },
  "follow-up": { label: "Follow-up", tone: "warn" },
  gotcha: { label: "Gotcha", tone: "danger" },
  advanced: { label: "Advanced", tone: "info" },
};

export function DeepDiveView({
  block,
  open,
  onToggle,
  faq = false,
}: {
  block: BlockOf<"deepDive">;
  open: boolean;
  onToggle: (open: boolean) => void;
  faq?: boolean;
}) {
  const badge = DIFF_BADGE[block.difficulty];
  return (
    <div className={cn("rounded-[var(--radius-lg)] border bg-surface transition-colors", open ? "border-accent" : "border-border")}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${block.id}-body`}
        onClick={() => onToggle(!open)}
        className="flex min-h-11 w-full items-start gap-3 px-6 py-4 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="eyebrow block">Go deeper</span>
          <span className="mt-0.5 block font-semibold text-ink">{block.title}</span>
          {!open && block.teaser ? <span className="mt-1 block text-sm text-ink-2">{block.teaser}</span> : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {faq ? <Badge tone="info">Mentor FAQ</Badge> : null}
          <Badge tone={badge.tone}>{badge.label}</Badge>
          <ChevronDown className={cn("h-4 w-4 text-ink-3 transition-transform", open && "rotate-180")} aria-hidden />
        </span>
      </button>
      {open ? (
        <div id={`${block.id}-body`} className="border-t border-divider px-6 pb-5 pt-4">
          <Markdown className="lesson-prose">{block.body}</Markdown>
        </div>
      ) : null}
    </div>
  );
}

export function CheckpointView({ block }: { block: BlockOf<"checkpoint"> }) {
  const { state, send } = useLesson();
  const saved = state(block.id);
  const marks = saved.marks ?? {};
  return (
    <div className="rounded-[var(--radius-lg)] border border-success/40 bg-success-bg p-4">
      <p className="text-base font-semibold text-ink">{block.title ?? "Say it out loud"}</p>
      <p className="mt-1 text-sm text-ink-2">
        Answer each one out loud, as if you were in an interview. Be honest — &ldquo;Shaky&rdquo; adds it to your review list.
      </p>
      <ol className="mt-3 space-y-2">
        {block.prompts.map((p, i) => {
          const m = marks[String(i)];
          return (
            <li key={i} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 sm:flex-row sm:items-center">
              <span className="min-w-0 flex-1 text-sm text-ink">{p}</span>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={m === "nailed" ? "default" : "outline"}
                  aria-pressed={m === "nailed"}
                  className={cn(m === "nailed" && "bg-success text-white hover:bg-success")}
                  onClick={() => void send(block.id, { kind: "checkpoint", index: i, mark: "nailed" })}
                >
                  I nailed it
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={m === "shaky" ? "default" : "outline"}
                  aria-pressed={m === "shaky"}
                  className={cn(m === "shaky" && "bg-warn text-white hover:bg-warn")}
                  onClick={() => void send(block.id, { kind: "checkpoint", index: i, mark: "shaky" })}
                >
                  Shaky
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ExcelLinkView({ block }: { block: BlockOf<"excelLink"> }) {
  const { resources, completed, isAdmin } = useLesson();
  const r = resources[block.workbook];
  const keyUnlocked = completed || isAdmin;
  return (
    <div className="rounded-[var(--radius-lg)] border border-success/40 bg-success-bg p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success-bg text-sm font-bold text-success">
          XLS
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{r?.student?.title ?? block.workbook.replace(/_/g, " ")}</p>
          {block.body ? <p className="mt-0.5 text-sm text-ink-2">{block.body}</p> : null}
          {r?.student?.description ? <p className="mt-0.5 text-xs text-ink-2">{r.student.description}</p> : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {r?.student ? (
          <Button asChild size="sm">
            <a href={`/api/learn/resources/${r.student.id}/download`}>Download workbook</a>
          </Button>
        ) : (
          <span className="text-xs text-ink-3">Workbook coming soon — a mentor hasn&apos;t uploaded it yet.</span>
        )}
        {r?.answerKey ? (
          keyUnlocked ? (
            <Button asChild size="sm" variant="outline">
              <a href={`/api/learn/resources/${r.answerKey.id}/download`}>Download answer key</a>
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled title="Finish the lesson to unlock the answer key">
              🔒 Finish the lesson to unlock the answer key
            </Button>
          )
        ) : null}
      </div>
    </div>
  );
}
