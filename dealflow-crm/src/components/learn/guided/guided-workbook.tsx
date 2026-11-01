"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Download, Lightbulb, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Workbook, addr, isErr, parseAddr, parseInput, type Scalar } from "@/lib/formula/engine";
import { sheetsFromXlsx, sheetsToXlsx } from "@/lib/formula/load-xlsx";
import { matches, type WalkStep } from "@/lib/walkthroughs";
import { cn } from "@/lib/utils";

type Saved = { entries: Record<string, string>; completedStepIds: string[]; firstTryStepIds: string[] };
type Msg = { tone: "ok" | "warn" | "info"; text: string } | null;

const keyOf = (sheet: string, a: string) => `${sheet}!${a}`;
const MAX_COLS = 40;
const MAX_ROWS = 300;

function fmt(v: Scalar, z?: string): string {
  if (v === null || v === undefined) return "";
  if (isErr(v)) return v.error;
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") {
    if (z) {
      try {
        return XLSX.SSF.format(z, v);
      } catch {
        /* fall through */
      }
    }
    return Math.abs(v) >= 1000 ? v.toLocaleString("en-US", { maximumFractionDigits: 2 }) : String(Math.round(v * 10_000) / 10_000);
  }
  return String(v);
}

/** Every address a reference like "C7:G7" or "B22" covers. */
function expand(ref: string): string[] {
  const [a, b] = ref.replace(/\$/g, "").split(":");
  const A = parseAddr(a);
  if (!A) return [];
  if (!b) return [addr(A.col, A.row)];
  const B = parseAddr(b);
  if (!B) return [addr(A.col, A.row)];
  const out: string[] = [];
  for (let r = Math.min(A.row, B.row); r <= Math.max(A.row, B.row); r++) for (let c = Math.min(A.col, B.col); c <= Math.max(A.col, B.col); c++) out.push(addr(c, r));
  return out;
}

/** "=B22*(1+C19)" → "= Revenue (2026A) × (1 + Revenue growth (2027E))" using the step's reference labels. */
function plainEnglish(step: WalkStep): string {
  let f = step.expectedFormula ?? "";
  const refs = [...(step.references ?? [])].sort((a, b) => b.ref.length - a.ref.length);
  const marks: string[] = [];
  for (const r of refs) {
    const bare = r.ref.replace(/\$/g, "");
    const sheetPart = `(?:'?${r.sheet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}'?!)?`;
    const cellPart = bare
      .split(":")
      .map((x) => x.replace(/^([A-Z]+)(\d+)$/, "\\$?$1\\$?$2"))
      .join(":");
    const re = new RegExp(`${sheetPart}${cellPart}(?![0-9])`, "g");
    f = f.replace(re, () => {
      marks.push(r.label);
      return `\u0000${marks.length - 1}\u0000`;
    });
  }
  return f
    .replace(/^=/, "= ")
    .replace(/\*/g, " × ")
    .replace(/\//g, " ÷ ")
    .replace(/\+/g, " + ")
    .replace(/(?<=[\w)\u0000])-/g, " − ")
    .replace(/\u0000(\d+)\u0000/g, (_, i: string) => marks[Number(i)])
    .replace(/\s+/g, " ")
    .trim();
}

export function GuidedWorkbook({
  workbookKey,
  title,
  steps,
  sheetsOrder,
  studentUrl,
  saved,
  lessons,
}: {
  workbookKey: string;
  title: string;
  steps: WalkStep[];
  sheetsOrder: string[];
  studentUrl: string;
  saved: Saved;
  lessons: { id: string; label: string }[];
}) {
  const [wb, setWb] = useState<Workbook | null>(null);
  const [ver, setVer] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, string>>(saved.entries);
  const [completed, setCompleted] = useState<Set<string>>(new Set(saved.completedStepIds));
  const [firstTry, setFirstTry] = useState<Set<string>>(new Set(saved.firstTryStepIds));
  const [tries, setTries] = useState<Record<string, number>>({});
  const firstOpen = Math.max(0, steps.findIndex((s) => !saved.completedStepIds.includes(s.id)));
  const [idx, setIdx] = useState(firstOpen);
  const step = steps[idx];
  const [sheet, setSheet] = useState(step?.sheet ?? sheetsOrder[0]);
  const [sel, setSel] = useState(step?.cell ?? "A1");
  const [bar, setBar] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [hint, setHint] = useState(false);
  const [showMe, setShowMe] = useState(false);
  const [choice, setChoice] = useState("");
  const [text, setText] = useState("");
  const [textRevealed, setTextRevealed] = useState(false);
  const [hover, setHover] = useState<{ sheet: string; cells: Set<string> } | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [continueAnyway, setContinueAnyway] = useState(false);
  const barRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load the student workbook and replay saved entries.
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch(studentUrl);
        if (!res.ok) throw new Error("Couldn't load the workbook.");
        const book = new Workbook(sheetsFromXlsx(await res.arrayBuffer()));
        for (const [k, raw] of Object.entries(saved.entries)) {
          const i = k.lastIndexOf("!");
          book.set(k.slice(0, i), k.slice(i + 1), parseInput(raw));
        }
        if (!alive) return;
        setWb(book);
        setVer((v) => v + 1);
      } catch (e) {
        if (alive) setLoadError((e as Error).message);
      }
    })();
    return () => {
      alive = false;
    };
  }, [studentUrl, saved.entries]);

  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // The newest data for saving (state updates from one click land in the same tick).
  const latest = useRef({ entries: saved.entries, completed: new Set(saved.completedStepIds), firstTry: new Set(saved.firstTryStepIds) });
  /** Scrolls the grid just enough to show a cell, leaving room for the sticky row numbers and column letters. */
  const ensureVisible = useCallback((a: string) => {
    requestAnimationFrame(() => {
      const grid = gridRef.current;
      const td = document.getElementById(`gc-${a}`);
      if (!grid || !td) return;
      const left = td.offsetLeft;
      const top = td.offsetTop;
      const stickyW = 40;
      const stickyH = 24;
      if (left - stickyW < grid.scrollLeft) grid.scrollLeft = Math.max(0, left - stickyW - 8);
      else if (left + td.offsetWidth > grid.scrollLeft + grid.clientWidth) grid.scrollLeft = left + td.offsetWidth - grid.clientWidth + 8;
      if (top - stickyH < grid.scrollTop) grid.scrollTop = Math.max(0, top - stickyH - 8);
      else if (top + td.offsetHeight > grid.scrollTop + grid.clientHeight) grid.scrollTop = top + td.offsetHeight - grid.clientHeight + 8;
    });
  }, []);

  const save = useCallback(
    (next: { entries?: Record<string, string>; completed?: Set<string>; firstTry?: Set<string> }) => {
      if (next.entries) latest.current.entries = next.entries;
      if (next.completed) latest.current.completed = next.completed;
      if (next.firstTry) latest.current.firstTry = next.firstTry;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const payload = { entries: latest.current.entries, completedStepIds: [...latest.current.completed], firstTryStepIds: [...latest.current.firstTry] };
        void fetch(`/api/learn/workbooks/${workbookKey}/progress`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
          .then((r) => (r.ok ? r.json() : null))
          .then((d: { xpGained?: number; finished?: boolean } | null) => {
            if (d?.finished && d.xpGained && d.xpGained >= 25) toast(`Workbook finished. +${d.xpGained} XP`);
          });
      }, 800);
    },
    [workbookKey],
  );

  const rawFor = useCallback(
    (sh: string, a: string) => {
      const k = keyOf(sh, a);
      if (k in entries) return entries[k];
      const c = wb?.sheets.get(sh)?.cells[a];
      if (!c) return "";
      return c.f ?? (c.v === null || c.v === undefined ? "" : String(c.v));
    },
    [entries, wb],
  );

  // Move to a step: its sheet, its cell, reset the panel.
  useEffect(() => {
    if (!step) return;
    setSheet(step.sheet);
    setSel(step.cell);
    setBar(rawFor(step.sheet, step.cell));
    setMsg(null);
    setHint(false);
    setShowMe(false);
    setChoice("");
    setText("");
    setTextRevealed(false);
    ensureVisible(step.cell);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, ver === 0]);

  const commit = (sh: string, a: string, raw: string) => {
    if (!wb) return;
    const k = keyOf(sh, a);
    const next = { ...latest.current.entries };
    if (raw.trim()) next[k] = raw.trim();
    else delete next[k];
    wb.set(sh, a, parseInput(raw));
    setEntries(next);
    setVer((v) => v + 1);
    save({ entries: next });
    return next;
  };

  const complete = (s: WalkStep, first: boolean, note = "Correct.") => {
    const c = new Set(latest.current.completed).add(s.id);
    const f = first ? new Set(latest.current.firstTry).add(s.id) : latest.current.firstTry;
    setCompleted(c);
    setFirstTry(f);
    setMsg({ tone: "ok", text: note });
    save({ completed: c, firstTry: f });
    const nextIdx = steps.findIndex((x, i) => i > idx && !c.has(x.id));
    if (nextIdx >= 0) setTimeout(() => setIdx(nextIdx), 700);
  };

  const wrong = (s: WalkStep, got: Scalar) => {
    const n = (tries[s.id] ?? 0) + 1;
    setTries({ ...tries, [s.id]: n });
    if (n >= 2 && s.expectedValue !== null && s.expectedValue !== undefined) {
      setMsg({ tone: "warn", text: `Your result: ${fmt(got, s.numberFormat)}. Expected about ${fmt(s.expectedValue as Scalar, s.numberFormat)}.` });
    } else setMsg({ tone: "warn", text: "Not quite. Check the Uses list." });
  };

  const check = () => {
    if (!wb || !step) return;
    const first = !(tries[step.id] ?? 0) && !showMe;
    if (step.kind === "choice") {
      if (!choice) return setMsg({ tone: "info", text: "Pick an answer first." });
      commit(step.sheet, step.cell, choice);
      return String(choice).toLowerCase() === String(step.expectedValue).toLowerCase() ? complete(step, first) : wrong(step, choice);
    }
    if (step.kind === "text") {
      if (!text.trim()) return setMsg({ tone: "info", text: "Write your answer first." });
      commit(step.sheet, step.cell, text);
      setTextRevealed(true);
      return setMsg(null);
    }
    // Commit whatever is in the formula bar for the step cell first.
    const raw = sel === step.cell && sheet === step.sheet ? bar : rawFor(step.sheet, step.cell);
    if (!raw.trim()) return setMsg({ tone: "info", text: "Type your answer in the highlighted cell (or the formula bar), then press Check." });
    commit(step.sheet, step.cell, raw);
    const v = wb.get(step.sheet, step.cell);
    if (step.kind === "value") return matches(step, v) ? complete(step, first) : wrong(step, v);
    if (!raw.trim().startsWith("=")) {
      if (matches(step, v)) return setMsg({ tone: "info", text: "Right number. Now enter it as a formula that references the cells, so it updates when inputs change." });
      return wrong(step, v);
    }
    return matches(step, v) ? complete(step, first) : wrong(step, v);
  };

  const sheetData = wb?.sheets.get(sheet);
  const stepsHere = useMemo(() => steps.filter((s) => s.sheet === sheet), [steps, sheet]);
  const stepCells = useMemo(() => new Map(stepsHere.map((s) => [s.cell, s])), [stepsHere]);
  const refCells = useMemo(() => {
    const set = new Set<string>();
    for (const r of step?.references ?? []) if (r.sheet === sheet) for (const a of expand(r.ref)) set.add(a);
    return set;
  }, [step, sheet]);
  const dims = useMemo(() => {
    let cols = sheetData?.cols ?? 8;
    let rows = sheetData?.rows ?? 30;
    for (const s of stepsHere) {
      const p = parseAddr(s.cell);
      if (p) {
        cols = Math.max(cols, p.col);
        rows = Math.max(rows, p.row);
      }
    }
    return { cols: Math.min(MAX_COLS, cols + 1), rows: Math.min(MAX_ROWS, rows + 2) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetData, stepsHere, ver]);

  const sheetNames = useMemo(() => {
    const all = wb ? [...wb.sheets.keys()] : sheetsOrder;
    return [...sheetsOrder.filter((s) => all.includes(s)), ...all.filter((s) => !sheetsOrder.includes(s))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wb, ver, sheetsOrder]);

  const select = (a: string) => {
    setSel(a);
    setBar(rawFor(sheet, a));
  };

  const onGridKey = (e: React.KeyboardEvent) => {
    if (e.target !== gridRef.current) return;
    const p = parseAddr(sel);
    if (!p) return;
    const move = (dc: number, dr: number) => {
      e.preventDefault();
      const a = addr(Math.max(1, p.col + dc), Math.max(1, p.row + dr));
      select(a);
      ensureVisible(a);
    };
    if (e.key === "ArrowRight" || e.key === "Tab") return move(1, 0);
    if (e.key === "ArrowLeft") return move(-1, 0);
    if (e.key === "ArrowDown") return move(0, 1);
    if (e.key === "ArrowUp") return move(0, -1);
    if (e.key === "Enter" || e.key === "F2") {
      e.preventDefault();
      barRef.current?.focus();
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      commit(sheet, sel, "");
      setBar("");
      return;
    }
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      setBar(e.key);
      barRef.current?.focus();
    }
  };

  const download = () => {
    if (!wb) return;
    const bytes = sheetsToXlsx([...wb.sheets.values()], (s, a) => wb.get(s, a));
    const blob = new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workbookKey}_my_work.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (narrow && !continueAnyway) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-6 text-center">
        <p className="font-semibold text-ink">Best on a laptop</p>
        <p className="mt-1 text-sm text-ink-2">The guided workbook is a full spreadsheet. It works on a phone, but it&apos;s easier on a bigger screen.</p>
        <Button className="mt-4" variant="secondary" onClick={() => setContinueAnyway(true)}>
          Continue anyway
        </Button>
      </div>
    );
  }
  if (loadError) return <p className="text-sm text-danger">{loadError}</p>;

  const done = completed.size;
  const widths = sheetData?.widths ?? [];
  const colW = (c: number) => Math.min(c === 1 ? 230 : 160, Math.max(56, widths[c - 1] || (c === 1 ? 200 : 96)));
  const grouped = sheetsOrder.map((s) => ({ sheet: s, steps: steps.map((x, i) => ({ x, i })).filter(({ x }) => x.sheet === s) })).filter((g) => g.steps.length);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      {/* Spreadsheet */}
      <div className="flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
        <div className="flex items-center gap-2 border-b border-border px-2 py-1.5">
          <span className="w-14 shrink-0 rounded border border-border bg-surface-2 px-1.5 py-1 text-center font-mono text-xs text-ink-2">{sel}</span>
          <span className="font-mono text-xs italic text-ink-3">fx</span>
          <input
            ref={barRef}
            value={bar}
            onChange={(e) => setBar(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commit(sheet, sel, bar);
                if (step && sheet === step.sheet && sel === step.cell && step.kind !== "text" && step.kind !== "choice") setTimeout(check, 0);
                gridRef.current?.focus();
              } else if (e.key === "Escape") {
                setBar(rawFor(sheet, sel));
                gridRef.current?.focus();
              }
            }}
            aria-label={`Formula bar for ${sheet}!${sel}`}
            spellCheck={false}
            className="h-8 min-w-0 flex-1 rounded border border-border-strong bg-surface px-2 font-mono text-[13px] text-ink focus-visible:border-accent focus-visible:outline-none"
            placeholder={step && sel === step.cell ? "Type = to start a formula, then press Enter" : ""}
          />
        </div>
        <div ref={gridRef} tabIndex={0} onKeyDown={onGridKey} className="relative max-h-[68vh] min-h-[420px] overflow-auto outline-none" aria-label="Spreadsheet">
          {!wb ? (
            <p className="p-6 text-sm text-ink-3">Loading the workbook…</p>
          ) : (
            <table className="border-separate border-spacing-0 font-mono text-[12px]" style={{ tableLayout: "fixed", width: 40 + Array.from({ length: dims.cols }, (_, i) => colW(i + 1)).reduce((a, b) => a + b, 0) }}>
              <colgroup>
                <col style={{ width: 40 }} />
                {Array.from({ length: dims.cols }, (_, i) => (
                  <col key={i} style={{ width: colW(i + 1) }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th className="sticky left-0 top-0 z-20 border-b border-r border-border bg-surface-2" />
                  {Array.from({ length: dims.cols }, (_, i) => (
                    <th key={i} className="sticky top-0 z-10 border-b border-r border-border bg-surface-2 px-1 py-0.5 text-center font-sans text-[11px] font-medium text-ink-3">
                      {addr(i + 1, 1).replace(/\d+$/, "")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: dims.rows }, (_, r) => (
                  <tr key={r}>
                    <th className="sticky left-0 z-10 border-b border-r border-border bg-surface-2 px-1 text-right font-sans text-[11px] font-medium text-ink-3">{r + 1}</th>
                    {Array.from({ length: dims.cols }, (_, c) => {
                      const a = addr(c + 1, r + 1);
                      const cd = sheetData?.cells[a];
                      const v = wb.get(sheet, a);
                      const st = stepCells.get(a);
                      const isCurrent = step && step.sheet === sheet && step.cell === a;
                      const isRef = refCells.has(a);
                      const isHover = hover?.sheet === sheet && hover.cells.has(a);
                      const isInput = !st && cd && !cd.f && typeof cd.v === "number";
                      const shown = fmt(v, cd?.z ?? (st ? st.numberFormat : undefined));
                      // Text spills into the next cell when it's empty, like Excel.
                      const right = addr(c + 2, r + 1);
                      const spill = typeof v === "string" && !sheetData?.cells[right] && !stepCells.has(right);
                      return (
                        <td
                          key={c}
                          id={`gc-${a}`}
                          onClick={() => select(a)}
                          onDoubleClick={() => {
                            select(a);
                            barRef.current?.focus();
                          }}
                          title={cd?.f ?? (st ? st.instruction : undefined)}
                          className={cn(
                            "h-6 cursor-cell whitespace-nowrap border-b border-r border-divider px-1.5",
                            spill ? "relative overflow-visible" : "overflow-hidden",
                            typeof v === "number" ? "text-right" : "text-left",
                            isInput ? "text-info" : "text-ink",
                            st && !completed.has(st.id) && "bg-warn-bg",
                            isRef && "bg-accent-tint",
                            isHover && "bg-accent/20",
                            sel === a && "outline outline-2 -outline-offset-2 outline-ink-3",
                            isCurrent && "outline outline-[3px] -outline-offset-[3px] outline-accent",
                            isErr(v) && "text-danger",
                          )}
                        >
                          {spill ? <span className="pointer-events-none relative z-[1]">{shown}</span> : shown}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex gap-0.5 overflow-x-auto border-t border-border bg-surface-2 px-2 pt-1">
          {sheetNames.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSheet(s);
                setSel("A1");
                setBar(rawFor(s, "A1"));
              }}
              className={cn("whitespace-nowrap rounded-t px-3 py-1.5 text-[12px]", s === sheet ? "bg-surface font-semibold text-accent shadow-[inset_0_-2px_0_var(--accent)]" : "text-ink-2 hover:bg-surface")}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Step panel */}
      <div className="space-y-3">
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2 text-[13px] text-ink-3">
            <span>
              Step {idx + 1} of {steps.length} · {step?.sheet}
            </span>
            <span>{done} done</span>
          </div>
          <ProgressBar value={(done / Math.max(1, steps.length)) * 100} className="mt-2" />
          {step ? (
            <div className="mt-4 space-y-3">
              {step.label || step.header ? (
                <p className="text-xs font-semibold text-accent">
                  {[step.label, step.header].filter(Boolean).join(" · ")} <span className="font-mono font-normal text-ink-3">{step.cell}</span>
                </p>
              ) : null}
              <p className="text-sm font-medium leading-relaxed text-ink">{step.instruction}</p>
              {completed.has(step.id) ? (
                <p className="flex items-center gap-1 text-[13px] font-medium text-success">
                  <Check className="size-4" /> Done
                </p>
              ) : null}
              {step.references?.length ? (
                <div>
                  <p className="mb-1 text-xs font-semibold text-ink-3">Uses</p>
                  <div className="flex flex-wrap gap-1.5">
                    {step.references.map((r) => (
                      <button
                        key={`${r.sheet}!${r.ref}`}
                        type="button"
                        onMouseEnter={() => setHover({ sheet: r.sheet, cells: new Set(expand(r.ref)) })}
                        onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover({ sheet: r.sheet, cells: new Set(expand(r.ref)) })}
                        onBlur={() => setHover(null)}
                        onClick={() => {
                          if (r.sheet !== sheet) setSheet(r.sheet);
                          ensureVisible(expand(r.ref)[0]);
                        }}
                        className="rounded border border-border bg-accent-tint px-2 py-1 text-left text-xs text-ink hover:border-accent"
                      >
                        <span className="font-medium">{r.label}</span>
                        <span className="ml-1 font-mono text-ink-3">
                          {r.sheet !== step.sheet ? `${r.sheet}!` : ""}
                          {r.ref}
                          {typeof r.value === "number" ? ` = ${fmt(r.value)}` : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {step.kind === "choice" ? (
                <Select value={choice} onChange={(e) => setChoice(e.target.value)} aria-label="Your answer">
                  <option value="">Pick an answer</option>
                  {(step.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              ) : step.kind === "text" ? (
                <div className="space-y-2">
                  <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-24" placeholder="A sentence or two" aria-label="Your answer" />
                  {textRevealed ? (
                    <div className="rounded-[var(--radius)] bg-surface-2 p-3 text-[13px] text-ink-2">
                      <p className="mb-1 text-xs font-semibold text-ink-3">Model answer</p>
                      {String(step.expectedValue)}
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="primary" onClick={() => complete(step, !(tries[step.id] ?? 0), "Nice.")}>
                          Got it
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => complete(step, false, "Marked for review.")}>
                          Review
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-[13px] text-ink-3">Type in the highlighted cell {step.cell} (or the formula bar), then press Enter or Check.</p>
              )}

              {msg ? <p className={cn("rounded-[var(--radius)] px-3 py-2 text-[13px]", msg.tone === "ok" ? "bg-success-bg text-success" : msg.tone === "warn" ? "bg-warn-bg text-warn" : "bg-surface-2 text-ink-2")}>{msg.text}</p> : null}

              <div className="flex flex-wrap gap-2">
                {!(step.kind === "text" && textRevealed) ? (
                  <Button size="sm" variant="primary" onClick={check}>
                    Check
                  </Button>
                ) : null}
                <Button size="sm" variant="secondary" onClick={() => setIdx(Math.min(steps.length - 1, idx + 1))} disabled={idx >= steps.length - 1}>
                  Skip
                </Button>
                {step.hint ? (
                  <Button size="sm" variant="ghost" onClick={() => setHint(true)} disabled={hint}>
                    <Lightbulb className="size-4" /> Hint
                  </Button>
                ) : null}
                {step.expectedFormula ? (
                  <Button size="sm" variant="ghost" onClick={() => setShowMe(true)} disabled={showMe}>
                    <Eye className="size-4" /> Show me
                  </Button>
                ) : null}
              </div>
              {hint && step.hint ? <p className="rounded-[var(--radius)] bg-surface-2 px-3 py-2 text-[13px] text-ink-2">{step.hint}</p> : null}
              {showMe && step.expectedFormula ? (
                <div className="rounded-[var(--radius)] bg-surface-2 px-3 py-2 text-[13px]">
                  <p className="font-mono text-ink">{step.expectedFormula}</p>
                  <p className="mt-1 text-ink-2">{plainEnglish(step)}</p>
                </div>
              ) : null}
              <div className="flex items-center justify-between border-t border-divider pt-2">
                <Button size="sm" variant="ghost" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
                  <ChevronLeft className="size-4" /> Previous
                </Button>
                <Button size="sm" variant="ghost" disabled={idx >= steps.length - 1} onClick={() => setIdx(idx + 1)}>
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {done === steps.length ? (
          <div className="rounded-[var(--radius-lg)] border border-success/40 bg-success-bg p-4 text-sm text-success">You finished every step in this workbook.</div>
        ) : null}

        <div className="rounded-[var(--radius-lg)] border border-border bg-surface">
          <button type="button" onClick={() => setListOpen((o) => !o)} aria-expanded={listOpen} className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-ink">
            All steps
            <ChevronDown className={cn("size-4 text-ink-3 transition-transform", listOpen && "rotate-180")} />
          </button>
          {listOpen ? (
            <div className="max-h-80 overflow-y-auto border-t border-divider px-2 pb-2">
              {grouped.map((g) => (
                <div key={g.sheet} className="pt-2">
                  <p className="px-2 pb-1 text-xs font-semibold text-ink-3">
                    {g.sheet} · {g.steps.filter(({ x }) => completed.has(x.id)).length}/{g.steps.length}
                  </p>
                  {g.steps.map(({ x, i }) => (
                    <button
                      key={x.id}
                      type="button"
                      onClick={() => setIdx(i)}
                      className={cn("flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[13px] hover:bg-surface-2", i === idx && "bg-accent-tint")}
                    >
                      <span className={cn("size-2 shrink-0 rounded-full", completed.has(x.id) ? "bg-success" : "bg-border-strong")} aria-hidden />
                      <span className="w-6 shrink-0 text-ink-3">{i + 1}</span>
                      <span className="truncate text-ink-2">{[x.label, x.header].filter(Boolean).join(" · ") || x.instruction}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={download} disabled={!wb}>
            <Download className="size-4" /> Download my workbook
          </Button>
          {lessons.map((l) => (
            <Link key={l.id} href={`/learn/${l.id}`} className="text-[13px] text-accent hover:underline">
              Lesson {l.label}
            </Link>
          ))}
        </div>
        <p className="text-xs text-ink-3">{title}. Progress saves as you go.</p>
      </div>
    </div>
  );
}
