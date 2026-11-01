"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  PROGRAMS_2028,
  PROGRAM_CYCLE_LABEL,
  PROGRAM_SNAPSHOT_DATE,
  expectedOpen,
  programWindow,
  type Program,
  type ProgramBucket,
  type ProgramWindow,
} from "@/lib/recruiting-programs-2028";
import { Select } from "@/components/ui/select";

const BUCKETS: ProgramBucket[] = ["Bulge Bracket", "Elite Boutique", "Middle Market", "Buy-Side"];

const MY_STATUSES = [
  "Not Applied",
  "Applied",
  "Online Test",
  "Interviewing",
  "Superday",
  "Offer",
  "Rejected",
  "Not Interested",
] as const;
type MyStatus = (typeof MY_STATUSES)[number];

const STATUS_STYLE: Record<MyStatus, string> = {
  "Not Applied": "text-danger italic",
  Applied: "text-info",
  "Online Test": "text-info",
  Interviewing: "text-warn",
  Superday: "text-warn",
  Offer: "text-success font-semibold",
  Rejected: "text-ink-3 line-through",
  "Not Interested": "text-ink-3",
};

const STORAGE_KEY = "df-program-tracker-2028";

const WINDOW_RANK: Record<ProgramWindow, number> = { open: 0, "expected-soon": 1, "not-yet-open": 2, closed: 3 };

function fmt(iso: string | null): string {
  return iso ? format(parseISO(iso), "dd MMM yy") : "";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(iso: string, today: string): number {
  return Math.round((Date.parse(iso) - Date.parse(today)) / 86_400_000);
}

function readStatuses(): Record<string, MyStatus> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, MyStatus>;
  } catch {
    return {};
  }
}

export function ProgramTracker() {
  const [today] = useState(todayIso);
  const [statuses, setStatuses] = useState<Record<string, MyStatus>>({});
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState<"all" | ProgramBucket>("all");
  const [windowFilter, setWindowFilter] = useState<"all" | ProgramWindow | "mine">("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    setStatuses(readStatuses());
  }, []);

  const setStatus = (id: string, s: MyStatus) => {
    setStatuses((prev) => {
      const next = { ...prev, [id]: s };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  };

  const withWindow = useMemo(
    () => PROGRAMS_2028.map((p) => ({ p, w: programWindow(p, today) })),
    [today],
  );

  const counts = useMemo(() => {
    const c = { open: 0, closingSoon: 0, expectedSoon: 0, applied: 0 };
    for (const { p, w } of withWindow) {
      if (w === "open") c.open++;
      if (w === "open" && p.closes && daysUntil(p.closes, today) <= 14) c.closingSoon++;
      if (w === "expected-soon") c.expectedSoon++;
      const s = statuses[p.id];
      if (s && s !== "Not Applied" && s !== "Not Interested") c.applied++;
    }
    return c;
  }, [withWindow, statuses, today]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return withWindow
      .filter(({ p, w }) => {
        if (bucket !== "all" && p.bucket !== bucket) return false;
        if (windowFilter === "mine") {
          const s = statuses[p.id];
          if (!s || s === "Not Applied" || s === "Not Interested") return false;
        } else if (windowFilter !== "all" && w !== windowFilter) return false;
        if (q && !`${p.company} ${p.program} ${p.locations ?? ""}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        if (a.w !== b.w) return WINDOW_RANK[a.w] - WINDOW_RANK[b.w];
        if (a.w === "open") {
          // Soonest deadline first; rolling (no deadline) after.
          return (a.p.closes ?? "9999").localeCompare(b.p.closes ?? "9999") || (b.p.opens ?? "").localeCompare(a.p.opens ?? "");
        }
        const ae = expectedOpen(a.p) ?? "9999";
        const be = expectedOpen(b.p) ?? "9999";
        return ae.localeCompare(be) || a.p.company.localeCompare(b.p.company);
      });
  }, [withWindow, bucket, windowFilter, query, statuses]);

  const grouped = useMemo(
    () => BUCKETS.map((b) => ({ bucket: b, items: filtered.filter((x) => x.p.bucket === b) })).filter((g) => g.items.length),
    [filtered],
  );

  const addToPipeline = async (p: Program) => {
    setAdding(p.id);
    try {
      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          firmName: p.company,
          firmType: p.bucket === "Buy-Side" ? "PE" : "IB",
          role: p.program,
          stage: statuses[p.id] === "Applied" ? "APPLIED" : "TARGET",
          applicationDeadline: p.closes ?? undefined,
          notes: [p.locations, p.notes, p.prep ? `Test prep: ${p.prep}` : null].filter(Boolean).join(" · "),
        }),
      });
      if (!res.ok) throw new Error(((await res.json()) as { error?: string }).error ?? "Failed");
      toast.success(`${p.company} added to your pipeline`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add to pipeline");
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Open now", value: counts.open, tone: "text-success", filter: "open" as const },
          { label: "Closing ≤ 14 days", value: counts.closingSoon, tone: "text-danger", filter: "open" as const },
          { label: "Expected any day", value: counts.expectedSoon, tone: "text-warn", filter: "expected-soon" as const },
          { label: "You've applied", value: counts.applied, tone: "text-info", filter: "mine" as const },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setWindowFilter(s.filter)}
            className="rounded-xl border border-border bg-surface p-3 text-left transition hover:border-accent"
          >
            <p className={cn("font-mono text-2xl font-semibold", s.tone)}>{s.value}</p>
            <p className="text-xs text-ink-3">{s.label}</p>
          </button>
        ))}
      </div>

      <Card className="flex flex-wrap items-end gap-2 border-border bg-surface p-3">
        <label className="min-w-[180px] flex-1 text-xs text-ink-3">
          <span className="mb-0.5 block">Search firm, program, city</span>
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Evercore, Houston" />
        </label>
        <label className="text-xs text-ink-3">
          <span className="mb-0.5 block">Group</span>
          <Select
            
            value={bucket}
            onChange={(e) => setBucket(e.target.value as typeof bucket)}
          >
            <option value="all">All groups</option>
            {BUCKETS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-xs text-ink-3">
          <span className="mb-0.5 block">Status</span>
          <Select
            
            value={windowFilter}
            onChange={(e) => setWindowFilter(e.target.value as typeof windowFilter)}
          >
            <option value="all">All programs</option>
            <option value="open">Open now</option>
            <option value="expected-soon">Expected any day</option>
            <option value="not-yet-open">Not open yet</option>
            <option value="closed">Closed</option>
            <option value="mine">My applications</option>
          </Select>
        </label>
      </Card>

      <p className="text-xs text-ink-3">
        {PROGRAM_CYCLE_LABEL} programs · {PROGRAMS_2028.length} tracked · snapshot {fmt(PROGRAM_SNAPSHOT_DATE)}. Programs
        that haven&apos;t opened show last year&apos;s opening date — apply within days of opening, since many banks
        review on a rolling basis. Always confirm dates on the firm&apos;s careers page.
      </p>

      {grouped.length === 0 ? <p className="text-sm text-ink-3">No programs match these filters.</p> : null}

      {grouped.map((g) => (
        <section key={g.bucket} className="overflow-hidden rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setCollapsed((c) => ({ ...c, [g.bucket]: !c[g.bucket] }))}
            className="flex w-full items-center justify-between bg-surface px-3 py-2 text-left text-sm font-semibold text-ink"
          >
            <span>
              {collapsed[g.bucket] ? "＋" : "－"} {g.bucket}
            </span>
            <span className="text-xs font-normal text-ink-3">{g.items.length} programs</span>
          </button>
          {!collapsed[g.bucket] ? (
            <div className="divide-y divide-divider">
              <div className="hidden grid-cols-[150px_1.1fr_1.6fr_90px_90px_110px_100px_1fr] gap-2 bg-surface px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3 lg:grid">
                <span>My status</span>
                <span>Company</span>
                <span>Program</span>
                <span>Opens</span>
                <span>Closes</span>
                <span>Locations</span>
                <span>Last year</span>
                <span>Prep · notes</span>
              </div>
              {g.items.map(({ p, w }) => {
                const my = statuses[p.id] ?? "Not Applied";
                const closingDays = p.closes ? daysUntil(p.closes, today) : null;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "grid grid-cols-1 gap-1 px-3 py-2 text-sm lg:grid-cols-[150px_1.1fr_1.6fr_90px_90px_110px_100px_1fr] lg:items-center lg:gap-2",
                      w === "closed" && "opacity-60",
                    )}
                  >
                    <Select
                      aria-label={`My status for ${p.company}`}
                      className={cn("w-full rounded", STATUS_STYLE[my])}
                      value={my}
                      onChange={(e) => setStatus(p.id, e.target.value as MyStatus)}
                    >
                      {MY_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                    <span className="font-medium text-accent">{p.company}</span>
                    <span className="text-ink">{p.program}</span>
                    <span
                      className={cn(
                        "w-fit rounded px-1.5 py-0.5 font-mono text-xs",
                        w === "open" && "bg-success-bg text-success",
                        w === "closed" && "bg-danger-bg text-danger",
                      )}
                    >
                      {p.opens ? (
                        <>
                          <span className="text-ink-3 lg:hidden">Opens </span>
                          {fmt(p.opens)}
                        </>
                      ) : w === "expected-soon" ? (
                        <span className="text-warn">Any day</span>
                      ) : (
                        <span className="text-ink-3">—</span>
                      )}
                    </span>
                    <span
                      className={cn(
                        "w-fit rounded px-1.5 py-0.5 font-mono text-xs",
                        p.closes && w !== "closed" && "bg-success-bg text-success",
                        closingDays !== null && closingDays >= 0 && closingDays <= 7 && "bg-danger-bg text-danger",
                        w === "closed" && "bg-danger-bg text-danger",
                      )}
                    >
                      {p.closes ? (
                        <>
                          <span className="text-ink-3 lg:hidden">Closes </span>
                          {fmt(p.closes)}
                          {closingDays !== null && closingDays >= 0 && closingDays <= 14 ? ` (${closingDays}d)` : ""}
                        </>
                      ) : w === "open" ? (
                        <span className="text-ink-2">Rolling</span>
                      ) : (
                        ""
                      )}
                    </span>
                    <span className="text-xs text-ink-2">{p.locations ?? ""}</span>
                    <span className="font-mono text-xs text-ink-2">
                      {p.lastYearOpen ? (
                        <>
                          <span className="text-ink-3 lg:hidden">Last year opened </span>
                          {fmt(p.lastYearOpen)}
                        </>
                      ) : (
                        ""
                      )}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {p.materials.map((m) => (
                        <span
                          key={m}
                          title={m === "CV" ? "Resume" : m === "CL" ? "Cover letter" : "Written answers"}
                          className={cn(
                            "rounded border px-1 text-[10px]",
                            m === "CV" && "border-info text-info",
                            m === "CL" && "border-success text-success",
                            m === "WA" && "border-warn text-warn",
                          )}
                        >
                          {m}
                        </span>
                      ))}
                      {p.prep ? <span className="text-accent">{p.prep}</span> : null}
                      {p.notes ? <span className="text-ink-2">{p.notes}</span> : null}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-6 px-1.5 text-[11px]"
                        disabled={adding === p.id}
                        onClick={() => void addToPipeline(p)}
                      >
                        + Pipeline
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}
