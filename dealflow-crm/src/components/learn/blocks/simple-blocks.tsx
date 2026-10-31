"use client";

import { useMemo, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import type { BlockOf } from "@/lib/learn/schema";
import { Button } from "@/components/ui/button";
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
  return <Markdown>{block.body}</Markdown>;
}

export function FormulaBlockView({ block }: { block: BlockOf<"formula"> }) {
  const [active, setActive] = useState<number | null>(null);
  return (
    <div className="rounded-xl border border-[#4a6fa5]/30 bg-[#4a6fa5]/[0.06] p-4">
      <div className="overflow-x-auto py-1 text-lg text-zinc-50 sm:text-xl">
        <Tex latex={block.latex} display />
      </div>
      {block.caption ? <p className="mt-1 text-center text-xs text-zinc-400">{block.caption}</p> : null}
      {block.legend.length ? (
        <ul className="mt-3 divide-y divide-white/5 rounded-lg border border-white/10 bg-zinc-950/60">
          {block.legend.map((row, i) => (
            <li key={row.symbol}>
              <button
                type="button"
                aria-pressed={active === i}
                onClick={() => setActive(active === i ? null : i)}
                className={cn(
                  "flex w-full items-baseline gap-3 px-3 py-2 text-left text-sm transition-colors",
                  active === i ? "bg-[#4a6fa5]/25 text-zinc-50" : "text-zinc-300 hover:bg-zinc-900",
                )}
              >
                <span className="w-24 shrink-0 text-zinc-50">
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
    <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{block.title ?? "Walk through it"}</p>
        <span className="font-mono text-xs text-zinc-500">
          {i + 1}/{block.steps.length}
          {saved.done ? <span className="ml-2 text-emerald-400">✓</span> : null}
        </span>
      </div>
      <div className="min-h-[72px]" aria-live="polite">
        {step.heading ? <p className="mb-1 font-semibold text-zinc-50">{step.heading}</p> : null}
        <Markdown>{step.body}</Markdown>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Button type="button" size="sm" variant="outline" disabled={i === 0} onClick={() => go(i - 1)}>
          ← Back
        </Button>
        <div className="flex gap-1" aria-hidden>
          {block.steps.map((_, k) => (
            <span key={k} className={cn("h-1.5 w-4 rounded-full", k <= i ? "bg-[#4a6fa5]" : "bg-zinc-700")} />
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

const DIFF_BADGE: Record<BlockOf<"deepDive">["difficulty"], { label: string; cls: string }> = {
  core: { label: "Core", cls: "border-emerald-700 bg-emerald-950/50 text-emerald-300" },
  "follow-up": { label: "Follow-up", cls: "border-amber-700 bg-amber-950/50 text-amber-300" },
  gotcha: { label: "Gotcha", cls: "border-red-700 bg-red-950/50 text-red-300" },
  advanced: { label: "Advanced", cls: "border-purple-700 bg-purple-950/50 text-purple-300" },
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
    <div className={cn("rounded-xl border bg-zinc-900/50 transition-colors", open ? "border-[#4a6fa5]/50" : "border-white/10")}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${block.id}-body`}
        onClick={() => onToggle(!open)}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <span
          className={cn("mt-0.5 shrink-0 text-zinc-400 transition-transform duration-200", open && "rotate-90")}
          aria-hidden
        >
          ▶
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-zinc-50">{block.title}</span>
            <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", badge.cls)}>
              {badge.label}
            </span>
            {faq ? (
              <span className="rounded border border-sky-700 bg-sky-950/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300">
                Mentor FAQ
              </span>
            ) : null}
          </span>
          {!open && block.teaser ? <span className="mt-1 block text-sm text-zinc-400">{block.teaser}</span> : null}
        </span>
      </button>
      {open ? (
        <div id={`${block.id}-body`} className="border-t border-white/5 px-4 pb-4 pt-3">
          <Markdown>{block.body}</Markdown>
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
    <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/10 p-4">
      <p className="text-base font-semibold text-zinc-50">{block.title ?? "Say it out loud"}</p>
      <p className="mt-1 text-sm text-zinc-400">
        Answer each one out loud, as if you were in an interview. Be honest — &ldquo;Shaky&rdquo; adds it to your review list.
      </p>
      <ol className="mt-3 space-y-2">
        {block.prompts.map((p, i) => {
          const m = marks[String(i)];
          return (
            <li key={i} className="flex flex-col gap-2 rounded-lg border border-white/10 bg-zinc-950/60 p-3 sm:flex-row sm:items-center">
              <span className="min-w-0 flex-1 text-sm text-zinc-100">{p}</span>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={m === "nailed" ? "default" : "outline"}
                  aria-pressed={m === "nailed"}
                  className={cn(m === "nailed" && "bg-emerald-600 text-white hover:bg-emerald-500")}
                  onClick={() => void send(block.id, { kind: "checkpoint", index: i, mark: "nailed" })}
                >
                  I nailed it
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={m === "shaky" ? "default" : "outline"}
                  aria-pressed={m === "shaky"}
                  className={cn(m === "shaky" && "bg-amber-600 text-white hover:bg-amber-500")}
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
    <div className="rounded-xl border border-emerald-700/40 bg-emerald-950/15 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-700/30 text-sm font-bold text-emerald-200">
          XLS
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-zinc-50">{r?.student?.title ?? block.workbook.replace(/_/g, " ")}</p>
          {block.body ? <p className="mt-0.5 text-sm text-zinc-300">{block.body}</p> : null}
          {r?.student?.description ? <p className="mt-0.5 text-xs text-zinc-400">{r.student.description}</p> : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {r?.student ? (
          <Button asChild size="sm">
            <a href={`/api/learn/resources/${r.student.id}/download`}>Download workbook</a>
          </Button>
        ) : (
          <span className="text-xs text-zinc-500">Workbook coming soon — a mentor hasn&apos;t uploaded it yet.</span>
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
