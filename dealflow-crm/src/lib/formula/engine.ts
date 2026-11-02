/**
 * A small spreadsheet formula engine for the guided workbooks (Phase M). MIT, no dependencies, runs in the browser
 * and in Node. Supports cell and range references (with sheet names and $), + - * / ^ & comparisons, percent,
 * strings, booleans, array arithmetic (for SUMPRODUCT), and exactly these functions:
 * AVERAGE CORREL COVAR IF IRR MAX MEDIAN MIN NPV PV QUARTILE SLOPE SQRT STDEV SUM SUMIF SUMPRODUCT VARP.
 */

export type Err = { error: "#DIV/0!" | "#VALUE!" | "#REF!" | "#NAME?" | "#NUM!" | "#N/A" | "#CYCLE!" };
export type Scalar = number | string | boolean | null | Err;
export type Grid = Scalar[][];
export type Value = Scalar | Grid;

export const isErr = (v: unknown): v is Err => typeof v === "object" && v !== null && !Array.isArray(v) && "error" in v;
const E = (error: Err["error"]): Err => ({ error });
const isGrid = (v: Value): v is Grid => Array.isArray(v);

// ---------- addresses ----------

export function colToNum(col: string): number {
  let n = 0;
  for (const ch of col.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}
export function numToCol(n: number): string {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
export function parseAddr(a: string): { col: number; row: number } | null {
  const m = /^\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(a.trim());
  return m ? { col: colToNum(m[1]), row: Number(m[2]) } : null;
}
export const addr = (col: number, row: number) => `${numToCol(col)}${row}`;

// ---------- tokenizer ----------

type Tok =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "bool"; v: boolean }
  | { t: "ref"; sheet: string | null; a: string; b: string | null }
  | { t: "fn"; v: string }
  | { t: "op"; v: string }
  | { t: "("; v?: undefined }
  | { t: ")"; v?: undefined }
  | { t: ","; v?: undefined };

function tokenize(src: string): Tok[] {
  const s = src.trim().replace(/^=/, "");
  const out: Tok[] = [];
  let i = 0;
  const cellRe = /^\$?[A-Za-z]{1,3}\$?\d+/;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      let v = "";
      while (j < s.length) {
        if (s[j] === '"' && s[j + 1] === '"') {
          v += '"';
          j += 2;
        } else if (s[j] === '"') break;
        else v += s[j++];
      }
      out.push({ t: "str", v });
      i = j + 1;
      continue;
    }
    // Sheet-qualified reference: 'My Sheet'!A1 or Sheet1!A1:B2
    let sheet: string | null = null;
    let rest = s.slice(i);
    let m: RegExpExecArray | null;
    if (ch === "'") {
      const end = s.indexOf("'!", i + 1);
      if (end > i) {
        sheet = s.slice(i + 1, end).replace(/''/g, "'");
        rest = s.slice(end + 2);
        i = end + 2;
      }
    } else if ((m = /^([A-Za-z_][A-Za-z0-9_.]*)!/.exec(rest))) {
      sheet = m[1];
      i += m[0].length;
      rest = s.slice(i);
    }
    if ((m = cellRe.exec(rest)) && !/^[A-Za-z]{1,3}\d+\s*\(/.test(rest)) {
      let a = m[0];
      let b: string | null = null;
      i += a.length;
      const r2 = /^:(\$?[A-Za-z]{1,3}\$?\d+)/.exec(s.slice(i));
      if (r2) {
        b = r2[1];
        i += r2[0].length;
      }
      a = a.replace(/\$/g, "");
      out.push({ t: "ref", sheet, a, b: b ? b.replace(/\$/g, "") : null });
      continue;
    }
    if (sheet) throw new Error("Bad reference");
    if ((m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(rest))) {
      out.push({ t: "num", v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    if ((m = /^([A-Za-z][A-Za-z0-9_.]*)\s*\(/.exec(rest))) {
      out.push({ t: "fn", v: m[1].toUpperCase() });
      out.push({ t: "(" });
      i += m[0].length;
      continue;
    }
    if ((m = /^(TRUE|FALSE)\b/i.exec(rest))) {
      out.push({ t: "bool", v: m[1].toUpperCase() === "TRUE" });
      i += m[0].length;
      continue;
    }
    if ((m = /^(<=|>=|<>|[-+*/^&=<>%])/.exec(rest))) {
      out.push({ t: "op", v: m[1] });
      i += m[1].length;
      continue;
    }
    if (ch === "(" || ch === ")" || ch === ",") {
      out.push({ t: ch } as Tok);
      i++;
      continue;
    }
    if (ch === ";") {
      out.push({ t: "," });
      i++;
      continue;
    }
    throw new Error(`Unexpected "${ch}"`);
  }
  return out;
}

// ---------- parser (Pratt) ----------

type Node =
  | { k: "num"; v: number }
  | { k: "str"; v: string }
  | { k: "bool"; v: boolean }
  | { k: "ref"; sheet: string | null; a: string; b: string | null }
  | { k: "fn"; name: string; args: Node[] }
  | { k: "un"; op: string; x: Node }
  | { k: "pct"; x: Node }
  | { k: "bin"; op: string; l: Node; r: Node };

const BIN: Record<string, number> = { "=": 1, "<>": 1, "<": 1, ">": 1, "<=": 1, ">=": 1, "&": 2, "+": 3, "-": 3, "*": 4, "/": 4, "^": 5 };

export function parseFormula(src: string): Node {
  const toks = tokenize(src);
  let p = 0;
  const peek = () => toks[p];
  const expr = (minBp: number): Node => {
    let left = prefix();
    for (;;) {
      const t = peek();
      if (!t) break;
      if (t.t === "op" && t.v === "%") {
        p++;
        left = { k: "pct", x: left };
        continue;
      }
      if (t.t !== "op" || !(t.v in BIN)) break;
      const bp = BIN[t.v];
      if (bp < minBp) break;
      p++;
      // ^ is left-associative in Excel.
      left = { k: "bin", op: t.v, l: left, r: expr(bp + 1) };
    }
    return left;
  };
  const prefix = (): Node => {
    const t = toks[p++];
    if (!t) throw new Error("Formula ends early");
    switch (t.t) {
      case "num":
        return { k: "num", v: t.v };
      case "str":
        return { k: "str", v: t.v };
      case "bool":
        return { k: "bool", v: t.v };
      case "ref":
        return { k: "ref", sheet: t.sheet, a: t.a, b: t.b };
      case "op":
        if (t.v === "-" || t.v === "+") return { k: "un", op: t.v, x: expr(6) };
        throw new Error(`Unexpected ${t.v}`);
      case "(": {
        const e = expr(0);
        if (toks[p++]?.t !== ")") throw new Error("Missing )");
        return e;
      }
      case "fn": {
        p++; // (
        const args: Node[] = [];
        if (peek()?.t === ")") {
          p++;
          return { k: "fn", name: t.v, args };
        }
        for (;;) {
          args.push(expr(0));
          const n = toks[p++];
          if (n?.t === ")") break;
          if (n?.t !== ",") throw new Error("Expected , or )");
        }
        return { k: "fn", name: t.v, args };
      }
      default:
        throw new Error("Unexpected token");
    }
  };
  const tree = expr(0);
  if (p < toks.length) throw new Error("Unexpected text after formula");
  return tree;
}

// ---------- evaluation ----------

export type Resolver = {
  /** Value of one cell (evaluating its formula if it has one). */
  cell: (sheet: string, address: string) => Scalar;
  currentSheet: string;
};

const num = (v: Scalar): number | Err => {
  if (isErr(v)) return v;
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v === null || v === "") return 0;
  const n = Number(String(v).replace(/[$,%\s]/g, ""));
  return Number.isFinite(n) ? (String(v).trim().endsWith("%") ? n / 100 : n) : E("#VALUE!");
};

function rangeGrid(r: Resolver, sheet: string | null, a: string, b: string | null): Grid | Scalar {
  const sh = sheet ?? r.currentSheet;
  if (!b) return r.cell(sh, a);
  const A = parseAddr(a);
  const B = parseAddr(b);
  if (!A || !B) return E("#REF!");
  const [c1, c2] = [Math.min(A.col, B.col), Math.max(A.col, B.col)];
  const [r1, r2] = [Math.min(A.row, B.row), Math.max(A.row, B.row)];
  const g: Grid = [];
  for (let row = r1; row <= r2; row++) {
    const line: Scalar[] = [];
    for (let col = c1; col <= c2; col++) line.push(r.cell(sh, addr(col, row)));
    g.push(line);
  }
  return g;
}

const flat = (v: Value): Scalar[] => (isGrid(v) ? v.flat() : [v]);
/** Numbers from ranges (text and blanks skipped, like Excel) and from direct arguments (coerced). */
function nums(args: Value[]): number[] | Err {
  const out: number[] = [];
  for (const a of args) {
    if (isGrid(a)) {
      for (const x of a.flat()) {
        if (isErr(x)) return x;
        if (typeof x === "number") out.push(x);
      }
    } else {
      const n = num(a);
      if (isErr(n)) return n;
      out.push(n);
    }
  }
  return out;
}

function broadcast(l: Value, r: Value, f: (a: Scalar, b: Scalar) => Scalar): Value {
  if (!isGrid(l) && !isGrid(r)) return f(l, r);
  const L = isGrid(l) ? l : null;
  const R = isGrid(r) ? r : null;
  const rows = Math.max(L?.length ?? 1, R?.length ?? 1);
  const cols = Math.max(L?.[0]?.length ?? 1, R?.[0]?.length ?? 1);
  const at = (g: Grid | null, s: Value, i: number, j: number): Scalar => (g ? (g[g.length === 1 ? 0 : i]?.[g[0].length === 1 ? 0 : j] ?? E("#N/A")) : (s as Scalar));
  const out: Grid = [];
  for (let i = 0; i < rows; i++) {
    const line: Scalar[] = [];
    for (let j = 0; j < cols; j++) line.push(f(at(L, l, i, j), at(R, r, i, j)));
    out.push(line);
  }
  return out;
}

function cmp(op: string, a: Scalar, b: Scalar): Scalar {
  if (isErr(a)) return a;
  if (isErr(b)) return b;
  const na = typeof a === "string" ? a.toLowerCase() : a ?? 0;
  const nb = typeof b === "string" ? b.toLowerCase() : b ?? 0;
  switch (op) {
    case "=":
      return na === nb;
    case "<>":
      return na !== nb;
    case "<":
      return na < nb;
    case ">":
      return na > nb;
    case "<=":
      return na <= nb;
    default:
      return na >= nb;
  }
}

function arith(op: string, a: Scalar, b: Scalar): Scalar {
  const x = num(a);
  const y = num(b);
  if (isErr(x)) return x;
  if (isErr(y)) return y;
  switch (op) {
    case "+":
      return x + y;
    case "-":
      return x - y;
    case "*":
      return x * y;
    case "/":
      return y === 0 ? E("#DIV/0!") : x / y;
    default: {
      const v = Math.pow(x, y);
      return Number.isFinite(v) ? v : E("#NUM!");
    }
  }
}

const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

function quartileInc(xs: number[], q: number): number | Err {
  if (!xs.length || q < 0 || q > 4) return E("#NUM!");
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * (q / 4);
  const lo = Math.floor(pos);
  return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (pos - lo);
}

function irr(cfs: number[], guess = 0.1): number | Err {
  const npv = (r: number) => cfs.reduce((s, c, t) => s + c / Math.pow(1 + r, t), 0);
  const d = (r: number) => cfs.reduce((s, c, t) => s - (t * c) / Math.pow(1 + r, t + 1), 0);
  let r = guess;
  for (let i = 0; i < 100; i++) {
    const f = npv(r);
    const fp = d(r);
    if (Math.abs(f) < 1e-10) return r;
    if (!fp || !Number.isFinite(fp)) break;
    const next = r - f / fp;
    if (!Number.isFinite(next) || next <= -1) break;
    if (Math.abs(next - r) < 1e-12) return next;
    r = next;
  }
  // Bisection fallback.
  let lo = -0.9999;
  let hi = 10;
  if (npv(lo) * npv(hi) > 0) return E("#NUM!");
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    if (npv(lo) * npv(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

function pairs(a: Value, b: Value): [number[], number[]] | Err {
  const xa = flat(a);
  const xb = flat(b);
  if (xa.length !== xb.length) return E("#N/A");
  const A: number[] = [];
  const B: number[] = [];
  for (let i = 0; i < xa.length; i++) {
    if (isErr(xa[i])) return xa[i] as Err;
    if (isErr(xb[i])) return xb[i] as Err;
    if (typeof xa[i] === "number" && typeof xb[i] === "number") {
      A.push(xa[i] as number);
      B.push(xb[i] as number);
    }
  }
  return [A, B];
}

function criteria(c: Scalar): (v: Scalar) => boolean {
  if (typeof c === "number") return (v) => v === c;
  const s = String(c ?? "");
  const m = /^(<=|>=|<>|<|>|=)?(.*)$/.exec(s)!;
  const op = m[1] ?? "=";
  const rhs = m[2];
  const n = Number(rhs);
  const target: Scalar = rhs !== "" && Number.isFinite(n) ? n : rhs;
  return (v) => {
    if (typeof target === "number" && typeof v !== "number") return op === "<>";
    const r = cmp(op, typeof v === "string" ? v : v, target);
    return r === true;
  };
}

export const SUPPORTED = ["AVERAGE", "CORREL", "COVAR", "IF", "IRR", "MAX", "MEDIAN", "MIN", "NPV", "PV", "QUARTILE", "SLOPE", "SQRT", "STDEV", "SUM", "SUMIF", "SUMPRODUCT", "VARP"];

function callFn(name: string, argNodes: Node[], r: Resolver): Value {
  if (name === "IF") {
    const c = ev(argNodes[0], r);
    const cv = isGrid(c) ? c[0]?.[0] ?? null : c;
    if (isErr(cv)) return cv;
    const truthy = typeof cv === "string" ? E("#VALUE!") : Boolean(cv);
    if (isErr(truthy)) return truthy;
    if (truthy) return argNodes[1] ? ev(argNodes[1], r) : true;
    return argNodes[2] ? ev(argNodes[2], r) : false;
  }
  const args = argNodes.map((a) => ev(a, r));
  const NUMS = () => nums(args);
  switch (name) {
    case "SUM": {
      const xs = NUMS();
      return isErr(xs) ? xs : xs.reduce((s, x) => s + x, 0);
    }
    case "AVERAGE": {
      const xs = NUMS();
      if (isErr(xs)) return xs;
      return xs.length ? mean(xs) : E("#DIV/0!");
    }
    case "MIN":
    case "MAX": {
      const xs = NUMS();
      if (isErr(xs)) return xs;
      return xs.length ? (name === "MIN" ? Math.min(...xs) : Math.max(...xs)) : 0;
    }
    case "MEDIAN": {
      const xs = NUMS();
      if (isErr(xs)) return xs;
      if (!xs.length) return E("#NUM!");
      const s = [...xs].sort((a, b) => a - b);
      const m = Math.floor(s.length / 2);
      return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
    }
    case "STDEV":
    case "VARP": {
      const xs = NUMS();
      if (isErr(xs)) return xs;
      const m = mean(xs);
      const ss = xs.reduce((s, x) => s + (x - m) ** 2, 0);
      if (name === "VARP") return xs.length ? ss / xs.length : E("#DIV/0!");
      return xs.length > 1 ? Math.sqrt(ss / (xs.length - 1)) : E("#DIV/0!");
    }
    case "SQRT": {
      const x = num(isGrid(args[0]) ? args[0][0][0] : args[0]);
      if (isErr(x)) return x;
      return x < 0 ? E("#NUM!") : Math.sqrt(x);
    }
    case "QUARTILE": {
      const xs = nums([args[0]]);
      const q = num(isGrid(args[1]) ? args[1][0][0] : args[1]);
      if (isErr(xs)) return xs;
      if (isErr(q)) return q;
      return quartileInc(xs, Math.floor(q));
    }
    case "SUMPRODUCT": {
      const grids = args.map((a) => (isGrid(a) ? a : [[a]]));
      const rows = grids[0].length;
      const cols = grids[0][0]?.length ?? 0;
      if (grids.some((g) => g.length !== rows || (g[0]?.length ?? 0) !== cols)) return E("#VALUE!");
      let total = 0;
      for (let i = 0; i < rows; i++)
        for (let j = 0; j < cols; j++) {
          let p = 1;
          for (const g of grids) {
            const v = g[i][j];
            if (isErr(v)) return v;
            p *= typeof v === "number" ? v : typeof v === "boolean" && grids.length === 1 ? Number(v) : 0;
          }
          total += p;
        }
      return total;
    }
    case "SUMIF": {
      const range = flat(args[0]);
      const sumRange = args[2] !== undefined ? flat(args[2]) : range;
      const crit = isGrid(args[1]) ? args[1][0][0] : args[1];
      const test = criteria(crit);
      let total = 0;
      range.forEach((v, i) => {
        const s = sumRange[i];
        if (test(v) && typeof s === "number") total += s;
      });
      return total;
    }
    case "NPV": {
      const rate = num(isGrid(args[0]) ? args[0][0][0] : args[0]);
      if (isErr(rate)) return rate;
      const xs = nums(args.slice(1));
      if (isErr(xs)) return xs;
      return xs.reduce((s, c, t) => s + c / Math.pow(1 + rate, t + 1), 0);
    }
    case "IRR": {
      const xs = nums([args[0]]);
      if (isErr(xs)) return xs;
      const g = args[1] !== undefined ? num(args[1] as Scalar) : 0.1;
      return isErr(g) ? g : irr(xs, g);
    }
    case "PV": {
      const [rate, nper, pmt, fv = 0, type = 0] = args.map((a) => num(isGrid(a) ? a[0][0] : a));
      for (const x of [rate, nper, pmt, fv, type]) if (isErr(x)) return x;
      const [R, N, P, F, T] = [rate, nper, pmt, fv, type] as number[];
      if (R === 0) return -(P * N + F);
      const f = Math.pow(1 + R, N);
      return -(F + (P * (1 + R * T) * (f - 1)) / R) / f;
    }
    case "SLOPE":
    case "CORREL":
    case "COVAR": {
      const pr = name === "SLOPE" ? pairs(args[0], args[1]) : pairs(args[0], args[1]);
      if (isErr(pr)) return pr;
      const [A, B] = pr; // SLOPE(known_y, known_x)
      if (A.length < 2) return E("#DIV/0!");
      const ma = mean(A);
      const mb = mean(B);
      let sab = 0;
      let saa = 0;
      let sbb = 0;
      for (let i = 0; i < A.length; i++) {
        sab += (A[i] - ma) * (B[i] - mb);
        saa += (A[i] - ma) ** 2;
        sbb += (B[i] - mb) ** 2;
      }
      if (name === "COVAR") return sab / A.length;
      if (name === "SLOPE") return sbb === 0 ? E("#DIV/0!") : sab / sbb;
      return saa === 0 || sbb === 0 ? E("#DIV/0!") : sab / Math.sqrt(saa * sbb);
    }
    default:
      return E("#NAME?");
  }
}

function ev(n: Node, r: Resolver): Value {
  switch (n.k) {
    case "num":
      return n.v;
    case "str":
      return n.v;
    case "bool":
      return n.v;
    case "ref":
      return rangeGrid(r, n.sheet, n.a, n.b);
    case "pct":
      return broadcast(ev(n.x, r), 100, (a, b) => arith("/", a, b));
    case "un": {
      const x = ev(n.x, r);
      return n.op === "-" ? broadcast(x, -1, (a, b) => arith("*", a, b)) : x;
    }
    case "fn":
      return callFn(n.name, n.args, r);
    case "bin": {
      const l = ev(n.l, r);
      const rr = ev(n.r, r);
      if (n.op === "&")
        return broadcast(l, rr, (a, b) => (isErr(a) ? a : isErr(b) ? b : `${typeof a === "boolean" ? String(a).toUpperCase() : (a ?? "")}${typeof b === "boolean" ? String(b).toUpperCase() : (b ?? "")}`));
      if (["=", "<>", "<", ">", "<=", ">="].includes(n.op)) return broadcast(l, rr, (a, b) => cmp(n.op, a, b));
      return broadcast(l, rr, (a, b) => arith(n.op, a, b));
    }
  }
}

/** Evaluates a formula string ("=B22*(1+C19)") to a single value. Parse errors become #NAME?. */
export function evaluate(formula: string, r: Resolver): Scalar {
  let tree: Node;
  try {
    tree = parseFormula(formula);
  } catch {
    return E("#NAME?");
  }
  const v = ev(tree, r);
  return isGrid(v) ? (v[0]?.[0] ?? null) : v;
}

/** Functions a formula calls (for "unsupported function" messages). */
export function functionsIn(formula: string): string[] {
  return [...new Set([...formula.toUpperCase().matchAll(/([A-Z][A-Z0-9.]*)\s*\(/g)].map((m) => m[1]))];
}

// ---------- workbook ----------

export type CellData = { v?: Scalar; f?: string; /** number format */ z?: string };
export type SheetData = {
  name: string;
  cells: Record<string, CellData>;
  cols: number;
  rows: number;
  /** Column widths in px (from !cols), index 0 = column A. */
  widths?: number[];
  /** Row heights in px (from !rows), index 0 = row 1. */
  heights?: number[];
  /** Merged ranges, 1-based. */
  merges?: { c1: number; r1: number; c2: number; r2: number }[];
  /** Cells with wrap text on. */
  wrap?: string[];
};

/** A recalculating workbook: formulas evaluate on demand with caching and cycle detection. */
export class Workbook {
  sheets: Map<string, SheetData>;
  private cache = new Map<string, Scalar>();
  private visiting = new Set<string>();

  constructor(sheets: SheetData[]) {
    this.sheets = new Map(sheets.map((s) => [s.name, s]));
  }

  private sheetFor(name: string): SheetData | undefined {
    return this.sheets.get(name) ?? [...this.sheets.values()].find((s) => s.name.toLowerCase() === name.toLowerCase());
  }

  get(sheet: string, a: string): Scalar {
    const sh = this.sheetFor(sheet);
    if (!sh) return E("#REF!");
    const key = `${sh.name}!${a}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    const c = sh.cells[a];
    if (!c) return null;
    if (!c.f) return c.v ?? null;
    if (this.visiting.has(key)) return E("#CYCLE!");
    this.visiting.add(key);
    const fns = functionsIn(c.f);
    // Formulas we can't evaluate keep Excel's cached value.
    const v = fns.every((f) => SUPPORTED.includes(f)) ? evaluate(c.f, { cell: (s, x) => this.get(s, x), currentSheet: sh.name }) : (c.v ?? null);
    this.visiting.delete(key);
    this.cache.set(key, v);
    return v;
  }

  set(sheet: string, a: string, input: CellData | null) {
    const sh = this.sheetFor(sheet);
    if (!sh) return;
    if (input === null) delete sh.cells[a];
    else sh.cells[a] = input;
    const p = parseAddr(a);
    if (p) {
      sh.cols = Math.max(sh.cols, p.col);
      sh.rows = Math.max(sh.rows, p.row);
    }
    this.cache.clear();
  }

  /** Evaluate a formula as if typed into sheet!cell (without storing it). */
  try(sheet: string, formula: string): Scalar {
    return evaluate(formula, { cell: (s, x) => this.get(s, x), currentSheet: this.sheetFor(sheet)?.name ?? sheet });
  }
}

/** Turns what a student typed into a cell into data: "=…" formula, number (1,000 / 5% / $3), or text. */
export function parseInput(raw: string): CellData | null {
  const s = raw.trim();
  if (!s) return null;
  if (s.startsWith("=")) return { f: s };
  const n = Number(s.replace(/[$,\s()]/g, "").replace(/%$/, ""));
  if (s.replace(/[$,\s%]/g, "") !== "" && Number.isFinite(n) && /^[-+$\d.,\s%()]+$/.test(s)) {
    const neg = /^\(.*\)$/.test(s) ? -1 : 1;
    return { v: (s.endsWith("%") ? n / 100 : n) * neg };
  }
  if (/^(true|false)$/i.test(s)) return { v: s.toLowerCase() === "true" };
  return { v: s };
}
