"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, Copy, FileUp, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchSelect } from "@/components/ui/search-select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import {
  CLASS_LEVELS,
  EXPERIENCE_OPTIONS,
  RECRUITING_TARGETS,
  scoreBand,
  type ClassLevel,
  type ExperienceId,
  type RecruitingTarget,
} from "@/lib/resume/rubric";
import type { ReviewV2 } from "@/lib/resume/grader";

type Stored = ReviewV2 & { fileUrl?: string | null; fileType?: "pdf" | "docx"; bulletTexts?: string[] };
type Row = { id: string; fileName: string; score: number; createdAt: string; feedback: unknown };

const isV2 = (f: unknown): f is Stored => Boolean(f && typeof f === "object" && (f as { version?: number }).version === 2);
const fmtScore = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const BAND_CLASS: Record<ReturnType<typeof scoreBand>["tone"], string> = {
  success: "text-success",
  accent: "text-accent",
  warn: "text-warn",
  danger: "text-danger",
};

export function ResumeReviewV2({
  defaultLevel,
  defaultTarget,
}: {
  defaultLevel: ClassLevel;
  defaultTarget: RecruitingTarget;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const levelRef = useRef<HTMLDivElement>(null);
  const [level, setLevel] = useState<ClassLevel>(defaultLevel);
  const [target, setTarget] = useState<RecruitingTarget>(defaultTarget);
  const [experience, setExperience] = useState<ExperienceId[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [regrade, setRegrade] = useState(false);
  const [compare, setCompare] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/resume/review", { credentials: "same-origin" });
    if (!res.ok) return;
    const d = (await res.json()) as { reviews: Row[] };
    setRows(d.reviews ?? []);
    setActiveId((cur) => (cur && d.reviews.some((r) => r.id === cur) ? cur : (d.reviews[0]?.id ?? null)));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const active = rows.find((r) => r.id === activeId) ?? null;
  const review = active && isV2(active.feedback) ? active.feedback : null;
  const previous = useMemo(() => {
    if (!active) return null;
    const older = rows.filter((r) => r.id !== active.id && r.createdAt < active.createdAt && isV2(r.feedback));
    return older[0] ?? null;
  }, [rows, active]);

  const run = async (opts: { file?: File; reviewId?: string }) => {
    setError("");
    setLoading(true);
    setProgress(2);
    setStage("Uploading");
    const fd = new FormData();
    if (opts.file) fd.append("file", opts.file);
    if (opts.reviewId) fd.append("reviewId", opts.reviewId);
    fd.append("level", level);
    fd.append("target", target);
    for (const e of experience) fd.append("experience", e);
    try {
      const res = await fetch("/api/resume/review", { method: "POST", body: fd, credentials: "same-origin" });
      const type = res.headers.get("content-type") ?? "";
      if (!res.ok || !res.body || type.includes("application/json")) {
        let msg = "Upload failed";
        try {
          msg = ((await res.json()) as { error?: string }).error ?? msg;
        } catch {
          /* not JSON */
        }
        setError(msg);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line) as
            | { type: "progress"; pct: number; stage?: string }
            | { type: "formatting"; score: number }
            | { type: "done"; review: Row }
            | { type: "error"; error: string };
          if (ev.type === "progress") {
            setProgress(ev.pct);
            if (ev.stage) setStage(ev.stage);
          } else if (ev.type === "formatting") setStage(`Layout checked (${fmtScore(ev.score)}/10) — reading your bullets`);
          else if (ev.type === "error") setError(ev.error);
          else if (ev.type === "done") {
            setProgress(100);
            setActiveId(ev.review.id);
            setRegrade(false);
            setCompare(false);
            await load();
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const onFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (f) void run({ file: f });
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this resume and its feedback?")) return;
    const res = await fetch(`/api/resume/review/${id}`, { method: "DELETE", credentials: "same-origin" });
    if (!res.ok) {
      toast.error("Couldn't delete it — try again.");
      return;
    }
    toast.success("Deleted");
    if (activeId === id) setActiveId(null);
    await load();
  };

  const startRegrade = () => {
    if (review) {
      setLevel(review.level);
      setTarget(review.target);
      setExperience(review.experience ?? []);
    }
    setRegrade(true);
    levelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resume review"
        subtitle="Graded against a strong resume at your level — not against professionals."
      />

      <div ref={levelRef}>
        <Card title="Grading level">
          <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)]">
            <div className="space-y-1.5">
              <p className="text-[13px] font-medium text-ink-2">Class year</p>
              <SegmentedControl
                ariaLabel="Class year"
                value={level}
                onChange={setLevel}
                options={CLASS_LEVELS.map((l) => ({ value: l, label: l }))}
                className="flex-wrap"
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <p className="text-[13px] font-medium text-ink-2">Recruiting for</p>
              <SearchSelect
                ariaLabel="Recruiting for"
                value={target}
                onChange={(v) => v && setTarget(v as RecruitingTarget)}
                options={RECRUITING_TARGETS.map((t) => ({ value: t, label: t }))}
                className="max-w-xs"
              />
            </div>
          </div>
          <fieldset className="mt-4">
            <legend className="text-[13px] font-medium text-ink-2">Experience so far (optional)</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {EXPERIENCE_OPTIONS.map((o) => {
                const on = experience.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setExperience((cur) => (on ? cur.filter((x) => x !== o.id) : [...cur, o.id]))}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] transition-colors",
                      on ? "border-accent bg-accent-tint text-accent" : "border-border-strong text-ink-2 hover:text-ink",
                    )}
                  >
                    {on ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
                    {o.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
          {regrade && active ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[var(--radius)] bg-accent-tint p-3 text-sm">
              <span className="text-ink-2">
                Re-grade <span className="font-medium text-ink">{active.fileName}</span> as {level} · {target}?
              </span>
              <Button size="sm" variant="primary" disabled={loading} onClick={() => void run({ reviewId: active.id })}>
                Re-grade
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRegrade(false)}>
                Cancel
              </Button>
            </div>
          ) : null}
        </Card>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => !loading && fileRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !loading && fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!loading) onFiles(e.dataTransfer.files);
        }}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-border-strong bg-surface p-8 text-center hover:border-accent"
      >
        <FileUp className="h-6 w-6 text-ink-3" aria-hidden />
        <p className="text-sm font-medium text-ink">Drop your resume here, or click to upload</p>
        <p className="text-[13px] text-ink-3">PDF for full grading. A .docx gets content feedback only.</p>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,application/pdf,.docx"
          className="hidden"
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {loading ? (
        <div className="space-y-2" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-[13px] text-ink-3">{stage}…</p>
        </div>
      ) : null}
      {error ? <p className="rounded-[var(--radius)] bg-danger-bg p-3 text-sm text-danger">{error}</p> : null}

      {active && !review ? (
        <Card>
          <div className="p-5 text-sm text-ink-2">
            This review was made with the old grader ({active.score}/100). Upload again for a level-based review.
          </div>
        </Card>
      ) : null}

      {review && active ? (
        <Results
          review={review}
          previous={previous && isV2(previous.feedback) ? { row: previous, review: previous.feedback } : null}
          compare={compare}
          setCompare={setCompare}
          onRegrade={startRegrade}
        />
      ) : null}

      {rows.length ? (
        <Card title="History">
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const v2 = isV2(r.feedback) ? r.feedback : null;
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(r.id);
                      setCompare(false);
                    }}
                    className={cn("min-w-0 flex-1 text-left text-sm", r.id === activeId ? "font-semibold text-ink" : "text-ink-2 hover:text-ink")}
                  >
                    <span className="break-words">{r.fileName}</span>
                    <span className="ml-2 text-[13px] font-normal text-ink-3">
                      {new Date(r.createdAt).toLocaleDateString()} · {v2 ? `${fmtScore(v2.overall)}/10 · ${v2.level} · ${v2.target}` : `${r.score}/100 (old grader)`}
                    </span>
                  </button>
                  <Button size="sm" variant="ghost" aria-label={`Delete ${r.fileName}`} onClick={() => void remove(r.id)}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}

function Results({
  review,
  previous,
  compare,
  setCompare,
  onRegrade,
}: {
  review: Stored;
  previous: { row: Row; review: Stored } | null;
  compare: boolean;
  setCompare: (v: boolean) => void;
  onRegrade: () => void;
}) {
  const band = scoreBand(review.overall);
  const [weakOnly, setWeakOnly] = useState<"weak" | "all">("weak");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const bullets = weakOnly === "weak" ? review.bullets.filter((b) => b.rating !== "strong") : review.bullets;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <div className="flex items-baseline gap-1">
            <span className={cn("text-5xl font-semibold tabular-nums", BAND_CLASS[band.tone])}>{fmtScore(review.overall)}</span>
            <span className="text-lg text-ink-3">/10</span>
          </div>
          <div className="min-w-0 space-y-1">
            <p className={cn("font-semibold", BAND_CLASS[band.tone])}>{band.label}</p>
            <p className="text-sm text-ink-2">
              Graded as: <span className="font-medium text-ink">{review.level} · {review.target}</span>{" "}
              <button type="button" onClick={onRegrade} className="ml-1 text-accent hover:underline">
                Re-grade at a different level
              </button>
            </p>
            {review.levelNote ? <p className="text-sm text-ink-2">{review.levelNote}</p> : null}
            {previous ? (
              <button type="button" onClick={() => setCompare(!compare)} className="text-[13px] text-accent hover:underline">
                {compare ? "Hide comparison" : "Compare with previous"}
              </button>
            ) : null}
          </div>
        </div>
      </Card>

      {compare && previous ? <Comparison current={review} previous={previous} /> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="What's already strong">
          <ul className="space-y-2 text-sm text-ink">
            {review.strengths.map((s, i) => (
              <li key={i} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Top 3 fixes">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-ink">
            {review.topFixes.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </Card>
      </div>

      <Card title="Category breakdown">
        <ul className="space-y-4">
          {review.categories.map((c) => (
            <li key={c.key}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-ink">
                  {c.name} <span className="text-[13px] font-normal text-ink-3">· weight {c.weight}</span>
                </span>
                <span className="text-sm tabular-nums text-ink-2">{c.score === null ? "—" : `${fmtScore(c.score)}/10`}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-accent" style={{ width: `${((c.score ?? 0) / 10) * 100}%` }} />
              </div>
              <p className="mt-1.5 text-[13px] text-ink-2">{c.summary}</p>
              {c.evidence.length ? (
                <>
                  <button
                    type="button"
                    onClick={() => setOpen((o) => ({ ...o, [c.key]: !o[c.key] }))}
                    className="mt-1 inline-flex items-center gap-1 text-[13px] text-accent hover:underline"
                    aria-expanded={Boolean(open[c.key])}
                  >
                    Evidence <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open[c.key] && "rotate-180")} aria-hidden />
                  </button>
                  {open[c.key] ? (
                    <ul className="mt-1 space-y-1 border-l-2 border-border pl-3 text-[13px] text-ink-2">
                      {c.evidence.map((e, i) => (
                        <li key={i}>{c.key === "formatting" ? e : `“${e}”`}</li>
                      ))}
                    </ul>
                  ) : null}
                </>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Formatting checklist">
        {review.formatting ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {review.formatting.checks.map((c) => (
              <li key={c.id} className="flex gap-2 text-sm">
                {c.pass === null ? (
                  <span className="mt-0.5 h-4 w-4 shrink-0 text-center text-ink-3">–</span>
                ) : c.pass ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="Pass" />
                ) : (
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-label="Fix" />
                )}
                <span className="min-w-0">
                  <span className="font-medium text-ink">{c.label}</span>
                  {c.pass === false || c.pass === null ? <span className="block text-[13px] text-ink-2">{c.message}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-2">Export to PDF to check formatting.</p>
        )}
      </Card>

      <Card
        title="Bullet by bullet"
        action={
          <SegmentedControl
            ariaLabel="Which bullets"
            value={weakOnly}
            onChange={setWeakOnly}
            options={[
              { value: "weak", label: "Needs work" },
              { value: "all", label: "All" },
            ]}
          />
        }
      >
        {bullets.length ? (
          <ul className="divide-y divide-border">
            {bullets.map((b, i) => (
              <li key={i} className="grid gap-3 py-3 md:grid-cols-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={b.rating === "strong" ? "success" : b.rating === "ok" ? "warn" : "danger"}>{b.rating}</Badge>
                    {b.section ? <span className="text-[12px] text-ink-3">{b.section}</span> : null}
                  </div>
                  <p className="mt-1.5 text-sm text-ink">{b.original}</p>
                  {b.issues.length ? <p className="mt-1 text-[13px] text-ink-3">{b.issues.join(" · ")}</p> : null}
                </div>
                <div className="min-w-0 rounded-[var(--radius)] bg-surface-2 p-3">
                  <p className="text-sm text-ink">{b.rewrite || b.original}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-1 -ml-2"
                    onClick={() => {
                      void navigator.clipboard.writeText(b.rewrite || b.original).then(
                        () => toast.success("Copied"),
                        () => toast.error("Couldn't copy"),
                      );
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden /> Copy
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-2">Every bullet reads well.</p>
        )}
      </Card>
    </div>
  );
}

function Comparison({ current, previous }: { current: Stored; previous: { row: Row; review: Stored } }) {
  const prev = previous.review;
  const delta = current.overall - prev.overall;
  const fixedChecks =
    current.formatting && prev.formatting
      ? prev.formatting.checks
          .filter((c) => c.pass === false && current.formatting!.checks.find((k) => k.id === c.id)?.pass === true)
          .map((c) => c.label)
      : [];
  const now = new Set((current.bulletTexts ?? current.bullets.map((b) => b.original)).map(norm));
  const rewritten = prev.bullets.filter((b) => b.rating !== "strong" && !now.has(norm(b.original)));
  const sameLevel = prev.level === current.level;
  const sign = (n: number) => (n > 0 ? `+${fmtScore(n)}` : fmtScore(n));

  return (
    <Card title={`Compared with ${previous.row.fileName} (${new Date(previous.row.createdAt).toLocaleDateString()})`}>
      {!sameLevel ? (
        <p className="mb-3 text-[13px] text-warn">The previous review was graded as {prev.level}, so scores aren&apos;t directly comparable.</p>
      ) : null}
      <p className="text-sm text-ink">
        Overall {fmtScore(prev.overall)} → {fmtScore(current.overall)}{" "}
        <span className={cn("font-semibold", delta > 0 ? "text-success" : delta < 0 ? "text-danger" : "text-ink-3")}>({sign(delta)})</span>
      </p>
      <ul className="mt-3 grid gap-1 text-[13px] text-ink-2 sm:grid-cols-2">
        {current.categories.map((c) => {
          const p = prev.categories.find((k) => k.key === c.key);
          if (c.score === null || p?.score == null) return null;
          const d = c.score - p.score;
          return (
            <li key={c.key}>
              {c.name}: {fmtScore(p.score)} → {fmtScore(c.score)}{" "}
              <span className={d > 0 ? "text-success" : d < 0 ? "text-danger" : "text-ink-3"}>({sign(d)})</span>
            </li>
          );
        })}
      </ul>
      {fixedChecks.length || rewritten.length ? (
        <div className="mt-3 space-y-1 text-sm">
          <p className="font-medium text-ink">Fixes made</p>
          <ul className="space-y-1 text-[13px] text-ink-2">
            {fixedChecks.map((l) => (
              <li key={l} className="flex gap-2">
                <Check className="h-4 w-4 shrink-0 text-success" aria-hidden /> {l} now passes
              </li>
            ))}
            {rewritten.map((b, i) => (
              <li key={i} className="flex gap-2">
                <Check className="h-4 w-4 shrink-0 text-success" aria-hidden /> Rewrote “{b.original.slice(0, 90)}
                {b.original.length > 90 ? "…" : ""}”
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-[13px] text-ink-3">No formatting fixes or rewritten weak bullets found since the previous upload.</p>
      )}
    </Card>
  );
}
