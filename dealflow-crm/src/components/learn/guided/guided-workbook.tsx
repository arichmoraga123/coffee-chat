"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Download, Lightbulb, Eye, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Workbook, addr, parseAddr, parseInput, type Scalar } from "@/lib/formula/engine";
import { sheetsFromXlsx, sheetsToXlsx } from "@/lib/formula/load-xlsx";
import { matches, type WalkStep } from "@/lib/walkthroughs";
import { cn } from "@/lib/utils";
import { fmtCell } from "@/components/learn/guided/format";
import { SpreadsheetGrid, type CommitResult, type Editability } from "@/components/learn/guided/spreadsheet-grid";

type Saved = { entries: Record<string, string>; completedStepIds: string[]; firstTryStepIds: string[] };
type Msg = { tone: "ok" | "warn" | "info"; text: string } | null;

const keyOf = (sheet: string, a: string) => `${sheet}!${a}`;
const MAX_COLS = 40;
const MAX_ROWS = 300;

const fmt = fmtCell;
const isInstructions = (name: string) => /^(instructions?|read ?me|start here)$/i.test(name.trim());

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
  const [, setFirstTry] = useState<Set<string>>(new Set(saved.firstTryStepIds));
  const [tries, setTries] = useState<Record<string, number>>({});
  const [bad, setBad] = useState<Set<string>>(new Set());
  const firstOpen = Math.max(0, steps.findIndex((s) => !saved.completedStepIds.includes(s.id)));
  const [idx, setIdx] = useState(firstOpen);
  const step = steps[idx];
  const [sheet, setSheet] = useState(step?.sheet ?? sheetsOrder[0]);
  const [sel, setSel] = useState(step?.cell ?? "A1");
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
  const [panelOpen, setPanelOpen] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Cells that had content in the original student file (inputs and labels stay locked). */
  const baseCells = useRef<Map<string, Set<string>>>(new Map());

  // Load the student workbook and replay saved entries.
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch(studentUrl);
        if (!res.ok) throw new Error("Couldn't load the workbook.");
        const sheets = sheetsFromXlsx(await res.arrayBuffer());
        baseCells.current = new Map(sheets.map((s) => [s.name, new Set(Object.keys(s.cells))]));
        const book = new Workbook(sheets);
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

  // The newest data for saving (state updates from one keystroke land in the same tick).
  const latest = useRef({ entries: saved.entries, completed: new Set(saved.completedStepIds), firstTry: new Set(saved.firstTryStepIds) });
  const selRef = useRef(sel);
  useEffect(() => {
    selRef.current = sel;
  }, [sel]);

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
      if (k in latest.current.entries) return latest.current.entries[k];
      const c = wb?.sheets.get(sh)?.cells[a];
      if (!c) return "";
      return c.f ?? (c.v === null || c.v === undefined ? "" : String(c.v));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, wb, ver],
  );

  const resetPanel = () => {
    setMsg(null);
    setHint(false);
    setShowMe(false);
    setChoice("");
    setText("");
    setTextRevealed(false);
  };

  /** Panel navigation: jump the grid to that step's cell. */
  const goToStep = (i: number) => {
    const s = steps[i];
    if (!s) return;
    setIdx(i);
    setSheet(s.sheet);
    setSel(s.cell);
    resetPanel();
  };

  /** The panel follows the selected answer cell (free order). */
  const followStep = (i: number) => {
    if (i === idx) return;
    setIdx(i);
    resetPanel();
  };

  const stepIndexAt = (sh: string, a: string) => steps.findIndex((s) => s.sheet === sh && s.cell === a);

  const writeCells = (sh: string, changes: { a: string; raw: string }[]) => {
    if (!wb || !changes.length) return;
    const next = { ...latest.current.entries };
    const unbad = new Set(bad);
    for (const { a, raw } of changes) {
      const k = keyOf(sh, a);
      if (raw.trim()) next[k] = raw.trim();
      else delete next[k];
      wb.set(sh, a, parseInput(raw));
      unbad.delete(k);
    }
    latest.current.entries = next;
    setBad(unbad);
    setEntries(next);
    setVer((v) => v + 1);
    save({ entries: next });
  };

  const complete = (s: WalkStep, first: boolean, note = "Correct.") => {
    const c = new Set(latest.current.completed).add(s.id);
    const f = first ? new Set(latest.current.firstTry).add(s.id) : latest.current.firstTry;
    setCompleted(c);
    setFirstTry(f);
    setMsg({ tone: "ok", text: note });
    save({ completed: c, firstTry: f });
    const at = steps.findIndex((x) => x.id === s.id);
    const nextIdx = steps.findIndex((x, i) => i > at && !c.has(x.id));
    // Move the panel on, unless the student already selected another answer cell.
    if (nextIdx >= 0)
      setTimeout(() => {
        const here = stepIndexAt(s.sheet, selRef.current);
        if (here < 0 || here === at) {
          setIdx(nextIdx);
          setMsg(null);
          setHint(false);
          setShowMe(false);
        }
      }, 700);
  };

  const wrong = (s: WalkStep, got: Scalar) => {
    const n = (tries[s.id] ?? 0) + 1;
    setTries({ ...tries, [s.id]: n });
    setBad((b) => new Set(b).add(keyOf(s.sheet, s.cell)));
    if (n >= 2 && s.expectedValue !== null && s.expectedValue !== undefined) {
      setMsg({ tone: "warn", text: `Your result: ${fmt(got, s.numberFormat)}. Expected about ${fmt(s.expectedValue as Scalar, s.numberFormat)}.` });
    } else setMsg({ tone: "warn", text: "Not quite. Check the Uses list." });
  };

  /** Checks a grid answer step against what's in its cell. */
  const checkGridStep = (s: WalkStep): CommitResult => {
    if (!wb) return null;
    const raw = rawFor(s.sheet, s.cell);
    const at = steps.findIndex((x) => x.id === s.id);
    if (at !== idx) {
      setIdx(at);
      resetPanel();
    }
    if (!raw.trim()) {
      setMsg({ tone: "info", text: `Type your answer in ${s.cell}, then press Enter.` });
      return null;
    }
    const first = !(tries[s.id] ?? 0) && !showMe;
    const v = wb.get(s.sheet, s.cell);
    if ((s.kind === "formula" || s.kind === "formula-text") && !raw.trim().startsWith("=")) {
      if (matches(s, v)) {
        setMsg({ tone: "info", text: "Right number. Now enter it as a formula that references the cells, so it updates when inputs change." });
        return "bad";
      }
      wrong(s, v);
      return "bad";
    }
    if (matches(s, v)) {
      complete(s, first);
      return "ok";
    }
    wrong(s, v);
    return "bad";
  };

  const checkCurrent = () => {
    if (!wb || !step) return;
    const first = !(tries[step.id] ?? 0) && !showMe;
    if (step.kind === "choice") {
      if (!choice) return setMsg({ tone: "info", text: "Pick an answer first." });
      writeCells(step.sheet, [{ a: step.cell, raw: choice }]);
      return String(choice).toLowerCase() === String(step.expectedValue).toLowerCase() ? complete(step, first) : wrong(step, choice);
    }
    if (step.kind === "text") {
      if (!text.trim()) return setMsg({ tone: "info", text: "Write your answer first." });
      writeCells(step.sheet, [{ a: step.cell, raw: text }]);
      setTextRevealed(true);
      return setMsg(null);
    }
    checkGridStep(step);
  };

  const sheetData = wb?.sheets.get(sheet);
  const stepsHere = useMemo(() => steps.filter((s) => s.sheet === sheet), [steps, sheet]);
  const answerCells = useMemo(() => new Map(stepsHere.map((s) => [s.cell, { numberFormat: s.numberFormat, step: s }])), [stepsHere]);
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
    return { cols: Math.min(MAX_COLS, Math.max(cols + 2, 10)), rows: Math.min(MAX_ROWS, Math.max(rows + 5, 30)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetData, stepsHere, ver]);

  const sheetNames = useMemo(() => {
    const all = wb ? [...wb.sheets.keys()] : sheetsOrder;
    const ordered = [...sheetsOrder.filter((s) => all.includes(s)), ...all.filter((s) => !sheetsOrder.includes(s))];
    // The Instructions sheet is always the first tab.
    return [...ordered.filter(isInstructions), ...ordered.filter((s) => !isInstructions(s))];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wb, ver, sheetsOrder]);

  const editability = useCallback(
    (a: string): Editability => {
      const st = answerCells.get(a)?.step;
      if (st) {
        if (st.kind === "choice" || st.kind === "text") return { ok: false, reason: "Answer this one in the steps panel." };
        return { ok: true };
      }
      if (baseCells.current.get(sheet)?.has(a)) return { ok: false, reason: "Inputs are locked here — change them in the downloaded workbook." };
      return { ok: true };
    },
    [answerCells, sheet],
  );

  const onSelect = (a: string) => {
    setSel(a);
    const i = stepIndexAt(sheet, a);
    if (i >= 0) followStep(i);
  };

  const onCommit = (changes: { a: string; raw: string }[], opts?: { check?: string }): CommitResult => {
    writeCells(sheet, changes);
    const target = opts?.check ? answerCells.get(opts.check)?.step : undefined;
    if (target && target.kind !== "choice" && target.kind !== "text") return checkGridStep(target);
    return null;
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
  const grouped = sheetsOrder.map((s) => ({ sheet: s, steps: steps.map((x, i) => ({ x, i })).filter(({ x }) => x.sheet === s) })).filter((g) => g.steps.length);

  const sheetTabs = (
    <div className="no-scrollbar flex shrink-0 gap-0.5 overflow-x-auto border-t border-border bg-surface-2 px-2 pt-1" role="tablist" aria-label="Sheets">
      {sheetNames.map((s) => (
        <button
          key={s}
          type="button"
          role="tab"
          aria-selected={s === sheet}
          onClick={() => {
            setSheet(s);
            const first = steps.find((x) => x.sheet === s && !completed.has(x.id)) ?? steps.find((x) => x.sheet === s);
            setSel(first?.cell ?? "A1");
            if (first) followStep(steps.indexOf(first));
          }}
          className={cn("whitespace-nowrap rounded-t px-3 py-1.5 text-[12px]", s === sheet ? "bg-surface font-semibold text-accent shadow-[inset_0_-2px_0_var(--accent)]" : "text-ink-2 hover:bg-surface")}
        >
          {s}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* Spreadsheet */}
      <div className="h-[calc(100vh-220px)] min-h-[460px] min-w-0 flex-1">
        {!wb ? (
          <div className="flex h-full items-center justify-center rounded-[var(--radius-lg)] border border-border bg-surface text-sm text-ink-3">Loading the workbook…</div>
        ) : isInstructions(sheet) ? (
          <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
            <InstructionsView data={sheetData} />
            {sheetTabs}
          </div>
        ) : (
          <SpreadsheetGrid
            sheetData={sheetData}
            sheet={sheet}
            sel={sel}
            onSelect={onSelect}
            value={(a) => wb.get(sheet, a)}
            rawFor={(a) => rawFor(sheet, a)}
            editability={editability}
            answerCells={answerCells}
            statusOf={(a) => {
              const st = answerCells.get(a)?.step;
              if (st && completed.has(st.id) && matches(st, wb.get(sheet, a))) return "ok";
              return bad.has(keyOf(sheet, a)) ? "bad" : null;
            }}
            refCells={refCells}
            hoverCells={hover?.sheet === sheet ? hover.cells : null}
            currentCell={step && step.sheet === sheet ? step.cell : null}
            cellTitle={(a) => answerCells.get(a)?.step.instruction}
            dims={dims}
            onCommit={onCommit}
            footer={sheetTabs}
          />
        )}
      </div>

      {/* Step panel (right-hand drawer) */}
      {panelOpen ? (
      <div className="w-full shrink-0 space-y-3 lg:w-[360px]">
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={() => setPanelOpen(false)} aria-label="Collapse steps panel">
            <PanelRightClose className="size-4" /> Hide steps
          </Button>
        </div>
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
                <p className="text-[13px] text-ink-3">Type in cell {step.cell} (or the formula bar) and press Enter. It checks automatically.</p>
              )}

              {msg ? <p className={cn("rounded-[var(--radius)] px-3 py-2 text-[13px]", msg.tone === "ok" ? "bg-success-bg text-success" : msg.tone === "warn" ? "bg-warn-bg text-warn" : "bg-surface-2 text-ink-2")}>{msg.text}</p> : null}

              <div className="flex flex-wrap gap-2">
                {!(step.kind === "text" && textRevealed) ? (
                  <Button size="sm" variant="primary" onClick={() => checkCurrent()}>
                    Check
                  </Button>
                ) : null}
                <Button size="sm" variant="secondary" onClick={() => goToStep(Math.min(steps.length - 1, idx + 1))} disabled={idx >= steps.length - 1}>
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
                <Button size="sm" variant="ghost" disabled={idx === 0} onClick={() => goToStep(idx - 1)}>
                  <ChevronLeft className="size-4" /> Previous
                </Button>
                <Button size="sm" variant="ghost" disabled={idx >= steps.length - 1} onClick={() => goToStep(idx + 1)}>
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
                      onClick={() => goToStep(i)}
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
      ) : (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          aria-label="Show steps panel"
          className="flex shrink-0 items-center gap-2 rounded-[var(--radius-lg)] border border-border bg-surface px-2 py-3 text-xs font-semibold text-ink-2 hover:text-ink lg:w-10 lg:flex-col"
        >
          <PanelRightOpen className="size-4" />
          <span className="lg:[writing-mode:vertical-rl]">Steps · {completed.size}/{steps.length}</span>
        </button>
      )}
    </div>
  );
}

/** The Instructions sheet as readable text: the steps and the color legend. */
function InstructionsView({ data }: { data: ReturnType<Workbook["sheets"]["get"]> }) {
  const rows = new Map<number, string[]>();
  for (const [a, c] of Object.entries(data?.cells ?? {})) {
    const p = parseAddr(a);
    if (!p || c.v === null || c.v === undefined || c.v === "") continue;
    const list = rows.get(p.row) ?? [];
    list[p.col - 1] = String(c.v);
    rows.set(p.row, list);
  }
  const lines = [...rows.entries()].sort((x, y) => x[0] - y[0]).map(([, cols]) => cols.filter(Boolean).join(" — "));
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl space-y-2 text-sm leading-relaxed text-ink">
        {lines.map((l, i) => (i === 0 ? <h2 key={i} className="section-title">{l}</h2> : <p key={i}>{l}</p>))}
      </div>
      <div className="mt-6 max-w-2xl rounded-[var(--radius)] border border-border p-4 text-[13px]">
        <p className="mb-2 font-semibold text-ink">Color legend</p>
        <ul className="space-y-1.5 text-ink-2">
          <li className="flex items-center gap-2">
            <span className="w-14 rounded border border-border px-1.5 text-right font-medium text-info">1,000</span> Blue: inputs (locked here)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-14 rounded border border-border px-1.5 text-right text-ink">751.31</span> Black: formulas
          </li>
          <li className="flex items-center gap-2">
            <span className="w-14 rounded border border-border bg-cell-answer px-1.5 text-right text-ink">&nbsp;</span> Yellow: your answer cells
          </li>
        </ul>
      </div>
    </div>
  );
}
