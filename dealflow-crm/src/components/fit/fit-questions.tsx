"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { FitQuestionPage, type StoryLite } from "@/components/fit/fit-question-page";
import { variantKind, type FitData } from "@/lib/fit";
import type { GroupProfile } from "@/lib/groupFinder";
import { cn } from "@/lib/utils";

type Status = "not_started" | "drafted" | "practiced";
const DOT: Record<Status, string> = { not_started: "bg-border-strong", drafted: "bg-warn", practiced: "bg-success" };
const LABEL: Record<Status, string> = { not_started: "Not started", drafted: "Drafted", practiced: "Practiced" };
const rank = (s: string) => (s === "practiced" ? 2 : s === "drafted" ? 1 : 0);

export function FitQuestions({
  data,
  statuses: initialStatuses,
  choices,
  stories,
  groups,
  basics,
  initial,
}: {
  data: FitData;
  /** "questionId|variant" → status */
  statuses: Record<string, string>;
  choices: { firm: string[]; city: string[]; group: string[] };
  stories: StoryLite[];
  groups: GroupProfile[];
  basics: { year: string | null; school: string | null; hometown: string | null; level: string };
  initial: { questionId: string | null; variant: string };
}) {
  const router = useRouter();
  const [statuses, setStatuses] = useState(initialStatuses);
  const [qid, setQid] = useState(initial.questionId ?? data.questions[0]?.id);
  const [variant, setVariant] = useState(initial.variant);
  const [open, setOpen] = useState<Record<string, boolean>>(() => Object.fromEntries(data.categories.map((c) => [c, true])));
  const question = data.questions.find((q) => q.id === qid) ?? data.questions[0];

  const statusOf = (id: string): Status => {
    let best = 0;
    for (const [k, s] of Object.entries(statuses)) if (k.split("|")[0] === id) best = Math.max(best, rank(s));
    return (["not_started", "drafted", "practiced"] as Status[])[best];
  };
  const select = (id: string) => {
    setQid(id);
    const q = data.questions.find((x) => x.id === id);
    // Keep the chosen variant when moving between questions of the same kind.
    if (!q || variantKind(q) !== variantKind(question)) setVariant("");
    router.replace(`/stories/fit?q=${id}`, { scroll: false });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <nav aria-label="Fit questions" className="space-y-3 lg:sticky lg:top-6 lg:max-h-[calc(100vh-48px)] lg:self-start lg:overflow-y-auto">
        <p className="flex flex-wrap gap-3 text-[12px] text-ink-3">
          {(Object.keys(DOT) as Status[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", DOT[s])} aria-hidden /> {LABEL[s]}
            </span>
          ))}
        </p>
        {data.categories.map((cat) => {
          const qs = data.questions.filter((q) => q.category === cat);
          if (!qs.length) return null;
          return (
            <div key={cat} className="rounded-[var(--radius-lg)] border border-border bg-surface">
              <button type="button" onClick={() => setOpen((o) => ({ ...o, [cat]: !o[cat] }))} aria-expanded={open[cat]} className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-semibold text-ink">
                {cat}
                <ChevronDown className={cn("h-4 w-4 text-ink-3 transition-transform", !open[cat] && "-rotate-90")} aria-hidden />
              </button>
              {open[cat] ? (
                <ul className="border-t border-divider py-1">
                  {qs.map((q) => {
                    const st = statusOf(q.id);
                    return (
                      <li key={q.id}>
                        <button
                          type="button"
                          onClick={() => select(q.id)}
                          aria-current={q.id === question.id ? "true" : undefined}
                          className={cn("flex w-full items-start gap-2 px-3 py-2 text-left text-[13px] hover:bg-surface-2", q.id === question.id ? "bg-accent-tint font-medium text-accent" : "text-ink-2")}
                        >
                          <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", DOT[st])} title={LABEL[st]} aria-label={LABEL[st]} />
                          <span className="min-w-0">{q.prompt}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </nav>
      <section className="min-w-0">
        <FitQuestionPage
          key={`${question.id}|${variant}`}
          question={question}
          variant={variant}
          onVariant={(v) => {
            setVariant(v);
            router.replace(`/stories/fit?q=${question.id}${v ? `&v=${encodeURIComponent(v)}` : ""}`, { scroll: false });
          }}
          choices={choices}
          stories={stories}
          groups={groups}
          basics={basics}
          onSaved={(s) => setStatuses((cur) => ({ ...cur, [`${question.id}|${variant}`]: s }))}
        />
      </section>
    </div>
  );
}
