"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Copy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { GROUP_TARGET_LABEL, GROUP_TRACK, groupSearchTerm, isOptional, type FinderAnswers, type GroupFinderData, type GroupMatch, type GroupProfile } from "@/lib/groupFinder";
import { cn } from "@/lib/utils";

type Saved = { id: string; createdAt: string; results: GroupMatch[] };

export function GroupFinder({ data, history: initialHistory, targets }: { data: GroupFinderData; history: Saved[]; targets: string[] }) {
  const [history, setHistory] = useState(initialHistory);
  const [taking, setTaking] = useState(initialHistory.length === 0);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<FinderAnswers>({});
  const [saving, setSaving] = useState(false);
  const [shown, setShown] = useState<string | null>(initialHistory[0]?.id ?? null);
  const q = data.questions[step];
  const last = step === data.questions.length - 1;

  const submit = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/fit/group-finder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }) });
      const d = (await res.json()) as Saved & { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Couldn't save.");
      setHistory((h) => [{ id: d.id, createdAt: d.createdAt, results: d.results }, ...h]);
      setShown(d.id);
      setTaking(false);
      window.scrollTo({ top: 0 });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [answers]);

  const next = useCallback(() => {
    if (!q) return;
    if (answers[q.id] === undefined && !isOptional(q)) return;
    if (last) void submit();
    else setStep((s) => s + 1);
  }, [q, answers, last, submit]);

  const choose = useCallback(
    (i: number) => {
      if (!q || !q.options[i]) return;
      setAnswers((a) => ({ ...a, [q.id]: i }));
    },
    [q],
  );

  // Keyboard: 1–9 picks an option, Enter goes next, Backspace/← goes back.
  useEffect(() => {
    if (!taking) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA"].includes(t.tagName)) return;
      if (/^[1-9]$/.test(e.key)) {
        e.preventDefault();
        choose(Number(e.key) - 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" && step > 0) setStep((s) => s - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [taking, choose, next, step]);

  if (taking && q) {
    const picked = answers[q.id];
    return (
      <Card>
        <div className="space-y-5 p-5 sm:p-6">
          <div className="space-y-2">
            <p className="text-[13px] text-ink-3">
              {step + 1} of {data.questions.length}
            </p>
            <ProgressBar value={((step + (picked !== undefined ? 1 : 0)) / data.questions.length) * 100} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-ink">{q.prompt}</h2>
            {q.note ? <p className="mt-1 text-sm text-ink-3">{q.note}</p> : null}
          </div>
          <div role="radiogroup" aria-label={q.prompt} className="grid gap-2">
            {q.options.map((o, i) => (
              <button
                key={o.label}
                type="button"
                role="radio"
                aria-checked={picked === i}
                onClick={() => choose(i)}
                className={cn(
                  "flex items-center gap-3 rounded-[var(--radius)] border px-4 py-3 text-left text-sm transition-colors",
                  picked === i ? "border-accent bg-accent-tint text-accent" : "border-border-strong text-ink hover:border-accent",
                )}
              >
                <kbd className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border text-[12px] text-ink-3">{i + 1}</kbd>
                {o.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="h-4 w-4" aria-hidden /> Back
            </Button>
            <div className="flex gap-2">
              {isOptional(q) ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAnswers((a) => {
                      const n = { ...a };
                      delete n[q.id];
                      return n;
                    });
                    if (last) void submit();
                    else setStep((s) => s + 1);
                  }}
                >
                  Skip
                </Button>
              ) : null}
              <Button variant="primary" disabled={(picked === undefined && !isOptional(q)) || saving} onClick={next}>
                {last ? (saving ? "Scoring…" : "See my groups") : "Next"} <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>
          <p className="text-[12px] text-ink-3">Tip: press 1–9 to pick, Enter for next.</p>
        </div>
      </Card>
    );
  }

  const current = history.find((h) => h.id === shown) ?? history[0];
  if (!current) return null;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-2">Your result from {new Date(current.createdAt).toLocaleDateString()}</p>
        <Button
          variant="secondary"
          onClick={() => {
            setAnswers({});
            setStep(0);
            setTaking(true);
          }}
        >
          <RotateCcw className="h-4 w-4" aria-hidden /> Retake
        </Button>
      </div>

      <div className="grid gap-4">
        {current.results.slice(0, 3).map((m, i) => {
          const g = data.groups.find((x) => x.id === m.id);
          return g ? <GroupCard key={m.id} rank={i + 1} match={m} group={g} targets={targets} /> : null;
        })}
      </div>
      <p className="text-[13px] text-ink-3">{data.disclaimer}</p>

      <AllGroups groups={data.groups.filter((g) => !current.results.slice(0, 3).some((m) => m.id === g.id))} match={current.results} targets={targets} />

      {history.length > 1 ? (
        <Card title="Earlier results">
          <ul className="divide-y divide-border">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <button type="button" onClick={() => setShown(h.id)} className={cn("text-left hover:underline", h.id === current.id ? "font-semibold text-ink" : "text-ink-2")}>
                  {new Date(h.createdAt).toLocaleDateString()}
                </button>
                <span className="text-[13px] text-ink-3">{h.results.slice(0, 3).map((r) => `${r.name} ${r.match}`).join(" · ")}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-3">{title}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-ink-2">
        {items.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

function GroupCard({ group: g, match, rank, targets }: { group: GroupProfile; match?: GroupMatch; rank?: number; targets: string[] }) {
  const [added, setAdded] = useState(false);
  const term = groupSearchTerm(g);
  const addTarget = async () => {
    const res = await fetch("/api/fit/targets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId: g.id }) });
    const d = (await res.json()) as { label?: string; added?: boolean };
    if (res.ok) {
      setAdded(true);
      toast.success(d.added ? `${d.label} added to your targets` : `${d.label} is already a target`);
    }
  };
  return (
    <Card>
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {rank ? <span className="text-sm font-semibold text-ink-3">#{rank}</span> : null}
              <h3 className="text-lg font-semibold text-ink">{g.name}</h3>
              <Badge tone={g.type === "product" ? "info" : "accent"}>{g.type === "product" ? "Product" : "Coverage"}</Badge>
            </div>
            <p className="mt-1 text-sm text-ink-2">{g.oneLiner}</p>
          </div>
          {match ? (
            <div className="text-right">
              <p className="text-3xl font-semibold tabular-nums text-accent">{match.match}</p>
              <p className="text-[12px] text-ink-3">match</p>
            </div>
          ) : null}
        </div>
        {match?.why.length ? (
          <div className="rounded-[var(--radius)] bg-accent-tint p-3">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-accent">Why this fits</p>
            <ul className="mt-1 space-y-0.5 text-[13px] text-ink">
              {match.why.map((w) => (
                <li key={w.questionId}>
                  You picked “{w.label}”
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="text-sm text-ink">{g.whatYouDo}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <List title="Typical deals" items={g.typicalDeals} />
          <List title="Skills" items={g.skills} />
          <List title="Good fit if" items={g.goodFitIf} />
          <List title="Trade-offs" items={g.tradeoffs} />
        </div>
        <p className="text-[13px] text-ink-2">
          <span className="text-ink-3">Common hubs:</span> {g.hubs.join(", ")}
          {g.relatedLessons.length ? (
            <>
              {" "}
              · <span className="text-ink-3">Lessons:</span>{" "}
              {g.relatedLessons.map((l, i) => (
                <span key={l}>
                  {i ? ", " : ""}
                  <Link href={`/learn/${l.replace(".", "-")}`} className="text-accent hover:underline">
                    {l}
                  </Link>
                </span>
              ))}
            </>
          ) : null}
        </p>
        <div className="flex flex-wrap gap-2 border-t border-divider pt-3">
          <Button size="sm" variant="primary" asChild>
            <Link href={`/stories/fit?q=why-group&v=${encodeURIComponent(g.name)}`}>Start your “Why {term}” answer</Link>
          </Button>
          <Button size="sm" variant="secondary" disabled={added} onClick={() => void addTarget()}>
            {added || targets.includes(GROUP_TARGET_LABEL[g.id] ?? g.name) ? <Check className="h-4 w-4" aria-hidden /> : null} Add to my targets
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/contacts?q=${encodeURIComponent(term)}`}>Find people in this group</Link>
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/recruiting/openings?track=${encodeURIComponent(GROUP_TRACK[g.id] ?? "IB")}&q=${encodeURIComponent(term)}`}>See openings</Link>
          </Button>
        </div>
        <details className="text-[13px]">
          <summary className="cursor-pointer font-medium text-accent">Questions to ask bankers</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-2">
            {g.questionsToAskBankers.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
          <Button
            size="sm"
            variant="ghost"
            className="mt-1"
            onClick={() =>
              void navigator.clipboard.writeText(g.questionsToAskBankers.map((q) => `- ${q}`).join("\n")).then(
                () => toast.success("Copied"),
                () => toast.error("Couldn't copy"),
              )
            }
          >
            <Copy className="h-3.5 w-3.5" aria-hidden /> Copy
          </Button>
        </details>
      </div>
    </Card>
  );
}

function AllGroups({ groups, match, targets }: { groups: GroupProfile[]; match: GroupMatch[]; targets: string[] }) {
  const [open, setOpen] = useState(false);
  const [one, setOne] = useState<string | null>(null);
  return (
    <div>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex items-center gap-1 text-sm font-medium text-ink">
        <ChevronDown className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")} aria-hidden /> All groups ({groups.length} more)
      </button>
      {open ? (
        <div className="mt-3 space-y-2">
          {groups.map((g) => {
            const m = match.find((x) => x.id === g.id);
            return (
              <div key={g.id}>
                <button
                  type="button"
                  onClick={() => setOne(one === g.id ? null : g.id)}
                  aria-expanded={one === g.id}
                  className="flex w-full items-center justify-between rounded-[var(--radius)] border border-border bg-surface px-4 py-2.5 text-left text-sm hover:border-accent"
                >
                  <span className="font-medium text-ink">{g.name}</span>
                  <span className="text-[13px] tabular-nums text-ink-3">{m ? `${m.match} match` : ""}</span>
                </button>
                {one === g.id ? (
                  <div className="mt-2">
                    <GroupCard group={g} match={m} targets={targets} />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
