/**
 * Reference helpers for the guided spreadsheet: shifting relative references (copy, paste, fill),
 * cycling $ anchors with F4, and point mode (inserting a clicked cell into a formula being typed).
 * Pure functions, no dependencies.
 */
import { addr, colToNum, numToCol } from "./engine";

// A cell reference, optionally sheet-qualified, not part of a longer name (LOG10, A1B) and not a function call.
const REF_RE = /(?<![A-Za-z0-9_.$!'])((?:'(?:[^']|'')+'|[A-Za-z_][\w.]*)!)?(\$?)([A-Za-z]{1,3})(\$?)(\d+)(?![\w(])/g;

/** Applies `fn` to every reference outside string literals. */
function mapRefs(
  formula: string,
  fn: (m: { sheet: string; colAbs: boolean; col: string; rowAbs: boolean; row: number }) => string,
): string {
  if (!formula.startsWith("=")) return formula;
  return formula
    .split(/("(?:[^"]|"")*")/)
    .map((part, i) =>
      i % 2 === 1
        ? part
        : part.replace(REF_RE, (_m, sheet: string | undefined, ca: string, col: string, ra: string, row: string) =>
            fn({ sheet: sheet ?? "", colAbs: ca === "$", col: col.toUpperCase(), rowAbs: ra === "$", row: Number(row) }),
          ),
    )
    .join("");
}

/** Shifts relative references by (dCol, dRow), like Excel copy/paste and fill. Out-of-range refs become #REF!. */
export function shiftFormula(formula: string, dCol: number, dRow: number): string {
  if (!formula.startsWith("=") || (!dCol && !dRow)) return formula;
  return mapRefs(formula, ({ sheet, colAbs, col, rowAbs, row }) => {
    const c = colAbs ? colToNum(col) : colToNum(col) + dCol;
    const r = rowAbs ? row : row + dRow;
    if (c < 1 || r < 1) return "#REF!";
    return `${sheet}${colAbs ? "$" : ""}${numToCol(c)}${rowAbs ? "$" : ""}${r}`;
  });
}

/** The reference token at (or just before) the caret: its start/end offsets and text. */
export function refAt(text: string, caret: number): { start: number; end: number; text: string } | null {
  const re = new RegExp(REF_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    // Include a range's second half (B5:B9) as one token.
    let end = m.index + m[0].length;
    const tail = /^:\$?[A-Za-z]{1,3}\$?\d+/.exec(text.slice(end));
    if (tail) end += tail[0].length;
    if (caret >= m.index && caret <= end) return { start: m.index, end, text: text.slice(m.index, end) };
    re.lastIndex = end;
  }
  return null;
}

const ANCHOR_CYCLE = (colAbs: boolean, rowAbs: boolean): [boolean, boolean] =>
  !colAbs && !rowAbs ? [true, true] : colAbs && rowAbs ? [false, true] : !colAbs && rowAbs ? [true, false] : [false, false];

/** F4: B5 → $B$5 → B$5 → $B5 → B5 for the reference under the caret (both halves of a range). */
export function cycleAnchor(text: string, caret: number): { text: string; caret: number } {
  const tok = refAt(text, caret);
  if (!tok) return { text, caret };
  const one = (s: string) => {
    const m = /^((?:'(?:[^']|'')+'|[A-Za-z_][\w.]*)!)?(\$?)([A-Za-z]{1,3})(\$?)(\d+)$/.exec(s);
    if (!m) return s;
    const [colAbs, rowAbs] = ANCHOR_CYCLE(m[2] === "$", m[4] === "$");
    return `${m[1] ?? ""}${colAbs ? "$" : ""}${m[3]}${rowAbs ? "$" : ""}${m[5]}`;
  };
  const replaced = tok.text.split(":").map(one).join(":");
  const next = text.slice(0, tok.start) + replaced + text.slice(tok.end);
  return { text: next, caret: tok.start + replaced.length };
}

/** True when the caret sits where a reference can be pointed in (after =, an operator, "(" or ","). */
export function canPoint(text: string, caret: number): boolean {
  if (!text.startsWith("=")) return false;
  const before = text.slice(0, caret).replace(/\s+$/, "");
  return /[=+\-*/^(,:&<>%]$/.test(before) && !/""$/.test(before);
}

/** "B5" or "B5:B9" for a pointed range (top-left to bottom-right). */
export function rangeText(a: { col: number; row: number }, b: { col: number; row: number }): string {
  const tl = addr(Math.min(a.col, b.col), Math.min(a.row, b.row));
  const br = addr(Math.max(a.col, b.col), Math.max(a.row, b.row));
  return tl === br ? tl : `${tl}:${br}`;
}
