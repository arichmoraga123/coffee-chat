"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { addr, isErr, parseAddr, type Scalar, type SheetData } from "@/lib/formula/engine";
import { canPoint, cycleAnchor, rangeText, shiftFormula } from "@/lib/formula/refs";
import { fmtCell } from "@/components/learn/guided/format";
import { cn } from "@/lib/utils";

type Pos = { col: number; row: number };
type Change = { a: string; raw: string };
export type CommitResult = "ok" | "bad" | null;
export type Editability = { ok: true } | { ok: false; reason: string };

type Edit = {
  text: string;
  caret: number;
  /** "enter": started by typing (arrows point or commit). "edit": F2 / double-click / formula bar (arrows move the caret). */
  mode: "enter" | "edit";
  where: "cell" | "bar";
  at: string;
  point: { start: number; end: number; anchor: Pos; cur: Pos } | null;
};

const ROW_HEAD_W = 44;
const DEFAULT_ROW_H = 24;
const DEFAULT_COL_W = 88;

const toPos = (a: string): Pos => parseAddr(a) ?? { col: 1, row: 1 };

export function SpreadsheetGrid({
  sheetData,
  sheet,
  sel,
  onSelect,
  value,
  rawFor,
  editability,
  answerCells,
  statusOf,
  refCells,
  hoverCells,
  currentCell,
  cellTitle,
  dims,
  onCommit,
  footer,
}: {
  sheetData: SheetData | undefined;
  sheet: string;
  sel: string;
  onSelect: (a: string) => void;
  value: (a: string) => Scalar;
  rawFor: (a: string) => string;
  editability: (a: string) => Editability;
  answerCells: Map<string, { numberFormat?: string | null }>;
  statusOf: (a: string) => "ok" | "bad" | null;
  refCells: Set<string>;
  hoverCells: Set<string> | null;
  currentCell: string | null;
  cellTitle: (a: string) => string | undefined;
  dims: { cols: number; rows: number };
  /** Writes cells; when `check` names a cell, the parent checks that answer and returns the result. */
  onCommit: (changes: Change[], opts?: { check?: string }) => CommitResult;
  footer: React.ReactNode;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const cellInputRef = useRef<HTMLInputElement>(null);
  const barInputRef = useRef<HTMLInputElement>(null);
  const [anchor, setAnchor] = useState(sel);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [lockTip, setLockTip] = useState<{ a: string; text: string } | null>(null);
  const undoStack = useRef<Change[][]>([]);
  const redoStack = useRef<Change[][]>([]);
  const clip = useRef<{ origin: Pos; raws: string[][]; tsv: string } | null>(null);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setEdit(null);
    undoStack.current = [];
    redoStack.current = [];
  }, [sheet]);

  // ---------- layout ----------
  const widths = useMemo(() => sheetData?.widths ?? [], [sheetData]);
  const heights = sheetData?.heights ?? [];
  const colAWidth = useMemo(() => {
    if (widths[0]) return widths[0];
    let longest = 0;
    for (const [a, c] of Object.entries(sheetData?.cells ?? {})) {
      const p = parseAddr(a);
      if (p?.col === 1 && typeof c.v === "string") longest = Math.max(longest, c.v.length);
    }
    return Math.max(120, Math.min(360, longest * 7 + 20));
  }, [sheetData, widths]);
  const colW = useCallback((c: number) => (c === 1 ? colAWidth : widths[c - 1] || DEFAULT_COL_W), [colAWidth, widths]);
  const rowH = (r: number) => Math.max(20, heights[r - 1] || DEFAULT_ROW_H);

  const mergeAt = useMemo(() => {
    const merges = sheetData?.merges ?? [];
    const master = new Map<string, { colSpan: number; rowSpan: number }>();
    const covered = new Set<string>();
    for (const m of merges) {
      master.set(addr(m.c1, m.r1), { colSpan: m.c2 - m.c1 + 1, rowSpan: m.r2 - m.r1 + 1 });
      for (let r = m.r1; r <= m.r2; r++) for (let c = m.c1; c <= m.c2; c++) if (c !== m.c1 || r !== m.r1) covered.add(addr(c, r));
    }
    return { master, covered };
  }, [sheetData]);
  const wrap = useMemo(() => new Set(sheetData?.wrap ?? []), [sheetData]);

  const hasContent = useCallback((a: string) => rawFor(a) !== "", [rawFor]);

  // ---------- helpers ----------
  const selPos = toPos(sel);
  const anchorPos = toPos(anchor);
  const range = {
    c1: Math.min(selPos.col, anchorPos.col),
    c2: Math.max(selPos.col, anchorPos.col),
    r1: Math.min(selPos.row, anchorPos.row),
    r2: Math.max(selPos.row, anchorPos.row),
  };
  const inRange = (c: number, r: number) => c >= range.c1 && c <= range.c2 && r >= range.r1 && r <= range.r2;

  const ensureVisible = useCallback((a: string) => {
    requestAnimationFrame(() => {
      const grid = gridRef.current;
      const td = document.getElementById(`gc-${a}`);
      if (!grid || !td) return;
      const left = td.offsetLeft;
      const top = td.offsetTop;
      if (left - ROW_HEAD_W < grid.scrollLeft) grid.scrollLeft = Math.max(0, left - ROW_HEAD_W - 8);
      else if (left + td.offsetWidth > grid.scrollLeft + grid.clientWidth) grid.scrollLeft = left + td.offsetWidth - grid.clientWidth + 8;
      if (top - DEFAULT_ROW_H < grid.scrollTop) grid.scrollTop = Math.max(0, top - DEFAULT_ROW_H - 8);
      else if (top + td.offsetHeight > grid.scrollTop + grid.clientHeight) grid.scrollTop = top + td.offsetHeight - grid.clientHeight + 8;
    });
  }, []);

  // When the parent moves the active cell (step navigation, sheet change), the range collapses to it.
  const selFromGrid = useRef(sel);
  useEffect(() => {
    if (sel !== selFromGrid.current) {
      selFromGrid.current = sel;
      setAnchor(sel);
      ensureVisible(sel);
    }
  }, [sel, sheet, ensureVisible]);
  const select = (a: string) => {
    selFromGrid.current = a;
    onSelect(a);
  };

  const clamp = (p: Pos): Pos => ({ col: Math.min(dims.cols, Math.max(1, p.col)), row: Math.min(dims.rows, Math.max(1, p.row)) });

  const moveTo = (p: Pos, extend = false) => {
    const a = addr(clamp(p).col, clamp(p).row);
    if (!extend) setAnchor(a);
    select(a);
    ensureVisible(a);
  };

  /** Ctrl/Cmd + arrow: jump to the edge of the data region. */
  const jump = (from: Pos, dc: number, dr: number): Pos => {
    const inside = (c: number, r: number) => c >= 1 && r >= 1 && c <= dims.cols && r <= dims.rows;
    const filled = (c: number, r: number) => hasContent(addr(c, r));
    let { col: c, row: r } = from;
    if (filled(c, r) && inside(c + dc, r + dr) && filled(c + dc, r + dr)) {
      while (inside(c + dc, r + dr) && filled(c + dc, r + dr)) {
        c += dc;
        r += dr;
      }
      return { col: c, row: r };
    }
    c += dc;
    r += dr;
    while (inside(c, r) && !filled(c, r)) {
      c += dc;
      r += dr;
    }
    return clamp({ col: c, row: r });
  };

  const showLock = (a: string, text: string) => {
    setLockTip({ a, text });
    if (lockTimer.current) clearTimeout(lockTimer.current);
    lockTimer.current = setTimeout(() => setLockTip(null), 2600);
  };

  /** Writes changes through the parent and records them for undo. */
  const write = (changes: Change[], opts?: { check?: string; record?: boolean }): CommitResult => {
    const real = changes.filter((ch) => rawFor(ch.a) !== ch.raw);
    if (!real.length && !opts?.check) return null;
    if (real.length && opts?.record !== false) {
      undoStack.current.push(real.map((ch) => ({ a: ch.a, raw: rawFor(ch.a) })));
      redoStack.current = [];
    }
    return onCommit(real.length ? real : changes, { check: opts?.check });
  };

  const focusGrid = () => requestAnimationFrame(() => gridRef.current?.focus({ preventScroll: true }));

  // ---------- editing ----------
  const startEdit = (at: string, text: string, mode: Edit["mode"], where: Edit["where"] = "cell") => {
    const e = editability(at);
    if (!e.ok) {
      showLock(at, e.reason);
      return;
    }
    setEdit({ text, caret: text.length, mode, where, at, point: null });
  };

  const finishEdit = (move: Pos | null) => {
    if (!edit) return;
    const at = edit.at;
    const result = write([{ a: at, raw: edit.text.trim() }], { check: at });
    setEdit(null);
    focusGrid();
    // A wrong answer keeps the cell selected so it can be fixed right away.
    if (move && result !== "bad") moveTo(move);
  };

  const cancelEdit = () => {
    setEdit(null);
    focusGrid();
  };

  // Keep the caret where the edit state says (after point-mode inserts and F4).
  useLayoutEffect(() => {
    if (!edit) return;
    const input = edit.where === "cell" ? cellInputRef.current : barInputRef.current;
    if (!input) return;
    if (document.activeElement !== input) input.focus({ preventScroll: true });
    if (input.selectionStart !== edit.caret || input.selectionEnd !== edit.caret) input.setSelectionRange(edit.caret, edit.caret);
  }, [edit]);

  const pointTo = (target: Pos, extend: boolean) => {
    if (!edit) return;
    const t = clamp(target);
    const start = edit.point ? edit.point.start : edit.caret;
    const end = edit.point ? edit.point.end : edit.caret;
    const anchorP = extend && edit.point ? edit.point.anchor : t;
    const ref = rangeText(anchorP, t);
    const text = edit.text.slice(0, start) + ref + edit.text.slice(end);
    setEdit({ ...edit, text, caret: start + ref.length, point: { start, end: start + ref.length, anchor: anchorP, cur: t } });
    ensureVisible(addr(t.col, t.row));
  };

  const pointable = (e: Edit) => Boolean(e.point) || canPoint(e.text, e.caret);

  const onEditKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!edit) return;
    const p = toPos(edit.at);
    const arrows: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      return finishEdit({ col: p.col, row: p.row + (e.shiftKey ? -1 : 1) });
    }
    if (e.key === "Tab") {
      e.preventDefault();
      return finishEdit({ col: p.col + (e.shiftKey ? -1 : 1), row: p.row });
    }
    if (e.key === "Escape") {
      e.preventDefault();
      return cancelEdit();
    }
    if (e.key === "F4") {
      e.preventDefault();
      const caret = e.currentTarget.selectionStart ?? edit.caret;
      const r = cycleAnchor(edit.text, caret);
      setEdit({ ...edit, text: r.text, caret: r.caret, point: null });
      return;
    }
    if (arrows[e.key]) {
      const [dc, dr] = arrows[e.key];
      const caret = e.currentTarget.selectionStart ?? edit.caret;
      const cur = { ...edit, caret };
      if (pointable(cur) && (edit.mode === "enter" || edit.point)) {
        e.preventDefault();
        const from = edit.point ? edit.point.cur : p;
        if (e.shiftKey && edit.point) pointTo({ col: edit.point.cur.col + dc, row: edit.point.cur.row + dr }, true);
        else pointTo({ col: from.col + dc, row: from.row + dr }, false);
        return;
      }
      if (edit.mode === "enter") {
        e.preventDefault();
        return finishEdit({ col: p.col + dc, row: p.row + dr });
      }
      // "edit" mode: arrows move the caret; leave pointing.
      if (edit.point) setEdit({ ...edit, point: null });
    }
  };

  const onEditChange = (text: string, caret: number) => {
    if (!edit) return;
    setEdit({ ...edit, text, caret, point: null });
  };

  // ---------- grid keys (not editing) ----------
  const fill = (dir: "down" | "right") => {
    const changes: Change[] = [];
    const single = range.c1 === range.c2 && range.r1 === range.r2;
    if (dir === "down") {
      const top = single ? range.r1 - 1 : range.r1;
      if (top < 1) return;
      for (let c = range.c1; c <= range.c2; c++) {
        const src = rawFor(addr(c, top));
        for (let r = top + 1; r <= range.r2; r++) changes.push({ a: addr(c, r), raw: shiftFormula(src, 0, r - top) });
      }
    } else {
      const left = single ? range.c1 - 1 : range.c1;
      if (left < 1) return;
      for (let r = range.r1; r <= range.r2; r++) {
        const src = rawFor(addr(left, r));
        for (let c = left + 1; c <= range.c2; c++) changes.push({ a: addr(c, r), raw: shiftFormula(src, c - left, 0) });
      }
    }
    applyMany(changes);
  };

  /** Writes several cells (paste, fill, clear), skipping locked ones, then checks the answers that changed. */
  const applyMany = (changes: Change[]) => {
    const allowed = changes.filter((ch) => editability(ch.a).ok);
    if (allowed.length < changes.length) showLock(sel, "Inputs are locked here — change them in the downloaded workbook.");
    if (!allowed.length) return;
    write(allowed);
    for (const ch of allowed) if (answerCells.has(ch.a) && ch.raw) onCommit([], { check: ch.a });
  };

  const onGridKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (edit) return;
    const mod = e.metaKey || e.ctrlKey;
    const arrows: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
    if (arrows[e.key]) {
      e.preventDefault();
      const [dc, dr] = arrows[e.key];
      const from = selPos;
      const target = mod ? jump(from, dc, dr) : { col: from.col + dc, row: from.row + dr };
      return moveTo(target, e.shiftKey);
    }
    if (e.key === "Tab") {
      e.preventDefault();
      return moveTo({ col: selPos.col + (e.shiftKey ? -1 : 1), row: selPos.row });
    }
    if (e.key === "Enter") {
      e.preventDefault();
      return moveTo({ col: selPos.col, row: selPos.row + (e.shiftKey ? -1 : 1) });
    }
    if (e.key === "F2") {
      e.preventDefault();
      return startEdit(sel, rawFor(sel), "edit");
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      const changes: Change[] = [];
      for (let r = range.r1; r <= range.r2; r++) for (let c = range.c1; c <= range.c2; c++) if (hasContent(addr(c, r))) changes.push({ a: addr(c, r), raw: "" });
      const allowed = changes.filter((ch) => editability(ch.a).ok);
      if (allowed.length < changes.length) showLock(sel, "Inputs are locked here — change them in the downloaded workbook.");
      if (allowed.length) write(allowed);
      return;
    }
    if (mod && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        const last = undoStack.current.pop();
        if (last) {
          redoStack.current.push(last.map((ch) => ({ a: ch.a, raw: rawFor(ch.a) })));
          onCommit(last);
        }
        return;
      }
      if (k === "y" || (k === "z" && e.shiftKey)) {
        e.preventDefault();
        const next = redoStack.current.pop();
        if (next) {
          undoStack.current.push(next.map((ch) => ({ a: ch.a, raw: rawFor(ch.a) })));
          onCommit(next);
        }
        return;
      }
      if (k === "d") {
        e.preventDefault();
        return fill("down");
      }
      if (k === "r") {
        e.preventDefault();
        return fill("right");
      }
      return; // copy / paste go through the clipboard events
    }
    if (e.key.length === 1 && !e.altKey) {
      e.preventDefault();
      startEdit(sel, e.key, "enter");
    }
  };

  const onCopy = (e: React.ClipboardEvent) => {
    if (edit) return;
    const raws: string[][] = [];
    for (let r = range.r1; r <= range.r2; r++) {
      const row: string[] = [];
      for (let c = range.c1; c <= range.c2; c++) row.push(rawFor(addr(c, r)));
      raws.push(row);
    }
    const tsv = raws.map((row) => row.join("\t")).join("\n");
    clip.current = { origin: { col: range.c1, row: range.r1 }, raws, tsv };
    e.clipboardData.setData("text/plain", tsv);
    e.preventDefault();
  };

  const onPaste = (e: React.ClipboardEvent) => {
    if (edit) return;
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    const internal = clip.current && clip.current.tsv === text ? clip.current : null;
    const raws = internal ? internal.raws : text.replace(/\r/g, "").replace(/\n$/, "").split("\n").map((l) => l.split("\t"));
    const changes: Change[] = [];
    raws.forEach((row, ri) =>
      row.forEach((raw, ci) => {
        const target = { col: range.c1 + ci, row: range.r1 + ri };
        if (target.col > dims.cols || target.row > dims.rows) return;
        const shifted = internal ? shiftFormula(raw, target.col - (internal.origin.col + ci), target.row - (internal.origin.row + ri)) : raw;
        changes.push({ a: addr(target.col, target.row), raw: shifted });
      }),
    );
    applyMany(changes);
  };

  // ---------- mouse ----------
  const onCellMouseDown = (e: React.MouseEvent, a: string) => {
    if (e.button !== 0) return;
    const p = toPos(a);
    if (edit) {
      const caretNow = (edit.where === "cell" ? cellInputRef.current : barInputRef.current)?.selectionStart ?? edit.caret;
      const cur = { ...edit, caret: caretNow };
      if (a !== edit.at && pointable(cur)) {
        // Point mode: clicking a cell inserts its reference (Shift extends to a range).
        e.preventDefault();
        setEdit(cur);
        if (e.shiftKey && edit.point) pointTo(p, true);
        else {
          const start = edit.point ? edit.point.start : caretNow;
          const end = edit.point ? edit.point.end : caretNow;
          const ref = rangeText(p, p);
          const text = cur.text.slice(0, start) + ref + cur.text.slice(end);
          setEdit({ ...cur, text, caret: start + ref.length, point: { start, end: start + ref.length, anchor: p, cur: p } });
        }
        return;
      }
      if (a === edit.at) return;
      e.preventDefault();
      const result = write([{ a: edit.at, raw: edit.text.trim() }], { check: edit.at });
      setEdit(null);
      if (result === "bad") return focusGrid();
    }
    e.preventDefault();
    gridRef.current?.focus({ preventScroll: true });
    if (e.shiftKey) {
      select(a);
      return;
    }
    setAnchor(a);
    select(a);
  };

  const onCellDoubleClick = (a: string) => startEdit(a, rawFor(a), "edit");

  // ---------- render ----------
  const tableWidth = ROW_HEAD_W + Array.from({ length: dims.cols }, (_, i) => colW(i + 1)).reduce((s, w) => s + w, 0);
  const barText = edit ? edit.text : rawFor(sel);
  const pointed = edit?.point ? { c1: Math.min(edit.point.anchor.col, edit.point.cur.col), c2: Math.max(edit.point.anchor.col, edit.point.cur.col), r1: Math.min(edit.point.anchor.row, edit.point.cur.row), r2: Math.max(edit.point.anchor.row, edit.point.cur.row) } : null;

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
      {/* Formula bar */}
      <div className="flex items-center gap-2 border-b border-border px-2 py-1.5">
        <span className="w-16 shrink-0 rounded border border-border bg-surface-2 px-1.5 py-1 text-center text-xs tabular-nums text-ink-2" data-testid="name-box">
          {range.c1 === range.c2 && range.r1 === range.r2 ? sel : rangeText({ col: range.c1, row: range.r1 }, { col: range.c2, row: range.r2 })}
        </span>
        <span className="text-xs italic text-ink-3">fx</span>
        <input
          ref={barInputRef}
          value={barText}
          data-testid="formula-bar"
          onFocus={() => {
            if (!edit) startEdit(sel, rawFor(sel), "edit", "bar");
            else if (edit.where !== "bar") setEdit({ ...edit, where: "bar" });
          }}
          onChange={(e) => onEditChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
          onKeyDown={onEditKey}
          onSelect={(e) => {
            const pos = e.currentTarget.selectionStart;
            setEdit((cur) => (cur && pos !== null && cur.caret !== pos ? { ...cur, caret: pos } : cur));
          }}
          aria-label={`Formula bar for ${sheet}!${sel}`}
          spellCheck={false}
          readOnly={!editability(sel).ok}
          className="h-8 min-w-0 flex-1 rounded border border-border-strong bg-surface px-2 text-[13px] tabular-nums text-ink focus-visible:border-accent focus-visible:outline-none"
          placeholder={answerCells.has(sel) ? "Type = to start a formula, then press Enter" : ""}
        />
      </div>

      {/* Grid */}
      <div
        ref={gridRef}
        tabIndex={0}
        role="grid"
        aria-label={`${sheet} sheet`}
        data-testid="grid"
        onKeyDown={onGridKey}
        onCopy={onCopy}
        onPaste={onPaste}
        className="relative min-h-0 flex-1 overflow-auto outline-none"
      >
        <table className="border-separate border-spacing-0 text-[13px] tabular-nums" style={{ tableLayout: "fixed", width: tableWidth }}>
          <colgroup>
            <col style={{ width: ROW_HEAD_W }} />
            {Array.from({ length: dims.cols }, (_, i) => (
              <col key={i} style={{ width: colW(i + 1) }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 border-b border-r border-border bg-surface-2" />
              {Array.from({ length: dims.cols }, (_, i) => (
                <th
                  key={i}
                  className={cn(
                    "sticky top-0 z-20 h-6 border-b border-r border-border bg-surface-2 px-1 text-center text-[11px] font-medium text-ink-3",
                    i + 1 >= range.c1 && i + 1 <= range.c2 && "bg-accent-tint text-accent",
                  )}
                >
                  {addr(i + 1, 1).replace(/\d+$/, "")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: dims.rows }, (_, ri) => {
              const r = ri + 1;
              return (
                <tr key={r} style={{ height: rowH(r) }}>
                  <th
                    className={cn(
                      "sticky left-0 z-20 border-b border-r border-border bg-surface-2 px-1.5 text-right text-[11px] font-medium text-ink-3",
                      r >= range.r1 && r <= range.r2 && "bg-accent-tint text-accent",
                    )}
                  >
                    {r}
                  </th>
                  {Array.from({ length: dims.cols }, (_, ci) => {
                    const c = ci + 1;
                    const a = addr(c, r);
                    if (mergeAt.covered.has(a)) return null;
                    const merge = mergeAt.master.get(a);
                    const cd = sheetData?.cells[a];
                    const v = value(a);
                    const answer = answerCells.get(a);
                    const shown = fmtCell(v, cd?.z ?? answer?.numberFormat ?? undefined);
                    const isNum = typeof v === "number";
                    const isInput = !answer && cd && !cd.f && typeof cd.v === "number";
                    const status = statusOf(a);
                    const editingHere = edit?.where === "cell" && edit.at === a;
                    const wrapped = wrap.has(a);
                    // Text overflows into empty cells to the right, like Excel.
                    let spill = 0;
                    if (typeof v === "string" && v && !wrapped && !merge) {
                      let w = colW(c);
                      for (let nc = c + 1; nc <= dims.cols; nc++) {
                        const na = addr(nc, r);
                        if (hasContent(na) || answerCells.has(na) || mergeAt.covered.has(na) || mergeAt.master.has(na)) break;
                        w += colW(nc);
                      }
                      if (w > colW(c)) spill = w;
                    }
                    const selected = inRange(c, r);
                    const isActive = sel === a;
                    const isPointed = pointed && c >= pointed.c1 && c <= pointed.c2 && r >= pointed.r1 && r <= pointed.r2;
                    return (
                      <td
                        key={a}
                        id={`gc-${a}`}
                        data-cell={a}
                        colSpan={merge?.colSpan}
                        rowSpan={merge?.rowSpan}
                        onMouseDown={(e) => onCellMouseDown(e, a)}
                        onDoubleClick={() => onCellDoubleClick(a)}
                        title={cellTitle(a)}
                        aria-selected={isActive}
                        className={cn(
                          "relative cursor-cell border-b border-r border-divider px-1.5",
                          wrapped ? "whitespace-normal break-words" : "whitespace-nowrap",
                          spill ? "overflow-visible" : "overflow-hidden",
                          isNum ? "text-right" : "text-left",
                          isInput ? "text-info" : "text-ink",
                          answer && "bg-cell-answer",
                          refCells.has(a) && "bg-accent-tint",
                          hoverCells?.has(a) && "bg-accent/20",
                          selected && !isActive && "bg-accent/10",
                          isErr(v) && "text-danger",
                          status && isNum && "pr-4",
                        )}
                      >
                        {spill ? (
                          <span className="pointer-events-none absolute inset-y-0 left-0 z-[1] flex items-center overflow-hidden px-1.5" style={{ width: spill }}>
                            {shown}
                          </span>
                        ) : (
                          shown
                        )}
                        {status === "ok" ? (
                          <span className="pointer-events-none absolute right-0.5 top-0.5 z-[2] text-success" aria-label="Correct">
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                        ) : status === "bad" ? (
                          <span
                            className="pointer-events-none absolute right-0 top-0 z-[2] h-0 w-0 border-l-[7px] border-t-[7px] border-l-transparent border-t-danger"
                            aria-label="Not correct yet"
                          />
                        ) : null}
                        {isActive || currentCell === a || isPointed ? (
                          <span
                            className={cn(
                              "pointer-events-none absolute inset-0 z-[3]",
                              isPointed ? "border-2 border-dashed border-accent" : isActive ? "border-2 border-accent" : "border-2 border-accent/40",
                            )}
                          />
                        ) : null}
                        {editingHere && edit ? (
                          <input
                            ref={cellInputRef}
                            value={edit.text}
                            data-testid="cell-editor"
                            onChange={(e) => onEditChange(e.target.value, e.target.selectionStart ?? e.target.value.length)}
                            onKeyDown={onEditKey}
                            onSelect={(e) => {
                              const pos = e.currentTarget.selectionStart;
                              setEdit((cur) => (cur && pos !== null && cur.caret !== pos ? { ...cur, caret: pos } : cur));
                            }}
                            onBlur={(e) => {
                              // Leaving the grid (not a point-mode click) commits, like clicking away in Excel.
                              const to = e.relatedTarget as Node | null;
                              if (to && (to === barInputRef.current || gridRef.current?.contains(to))) return;
                              write([{ a: edit.at, raw: edit.text.trim() }], { check: edit.at });
                              setEdit(null);
                            }}
                            spellCheck={false}
                            aria-label={`Editing ${a}`}
                            className="absolute inset-y-0 left-0 z-[4] border-2 border-accent bg-surface px-1.5 text-left text-[13px] text-ink outline-none"
                            style={{ minWidth: "100%", width: Math.max(colW(c), edit.text.length * 7.5 + 20) }}
                          />
                        ) : null}
                        {lockTip?.a === a ? (
                          <span role="status" className="pointer-events-none absolute left-0 top-full z-40 mt-1 whitespace-nowrap rounded-[var(--radius-sm)] bg-ink px-2 py-1 text-xs font-medium text-bg shadow">
                            {lockTip.text}
                          </span>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}
