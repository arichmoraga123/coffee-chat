/**
 * Converts content/LESSON_CONTENT.md into lesson JSON files (content/lessons/{id}-{slug}.json).
 *
 * Conversion, not authoring: every walkthrough step, fill-in, deep dive and checkpoint prompt is
 * carried over verbatim. Hand-written additions (formula blocks, one MCQ per lesson, question-bank
 * tags) live in ./overrides.ts. Lesson 5-2 keeps its hand-built JSON; only the two deep dives marked
 * "Additional deep dive to add" are appended.
 *
 * Usage: npx tsx scripts/learn/convert-content.ts && npm run validate-lessons
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { FORMULAS, MCQS, TAGS } from "./overrides";
import { WORKBOOK_LESSONS } from "../../src/lib/learn/workbook-map";

type Json = Record<string, unknown>;
type Block = Json & { type: string; id: string };

const ROOT = process.cwd();
const SRC = readFileSync(path.join(ROOT, "content/LESSON_CONTENT.md"), "utf8").replace(/\r\n/g, "\n");
const OUT = path.join(ROOT, "content/lessons");

/** Module titles, from the CURRICULUM.md recommended-path table. */
const MODULE_TITLES: Record<number, string> = {
  0: "Foundations",
  1: "Accounting",
  2: "Equity Value & Enterprise Value",
  3: "Valuation Overview",
  4: "Comps & Precedents",
  5: "Cost of Capital",
  6: "DCF",
  7: "M&A & Merger Models",
  8: "LBO",
  9: "Credit & Leveraged Finance",
  10: "Industry-Specific Valuation",
  11: "Mental Math & Brain Teasers",
};

/** Workbook ↔ lesson map (v2, shared with the app). */
const WORKBOOK_MAP: Record<string, string[]> = WORKBOOK_LESSONS;
const WORKBOOK_BY_PREFIX: Record<string, string> = Object.fromEntries(
  Object.keys(WORKBOOK_MAP).map((k) => [k.slice(0, 6), k]),
);

/** Mentor cross-reference only (guide + section). No guide text is ever copied. */
const SOURCE_SECTIONS: Record<number, [string, string]> = {
  0: ["Valuation fundamentals", "Valuation — Introduction"],
  1: ["Accounting", "Accounting"],
  2: ["Equity Value & Enterprise Value", "Enterprise Value"],
  3: ["Valuation", "Valuation"],
  4: ["Valuation — Comparables", "Comparable Companies & Precedent Transactions"],
  5: ["DCF — WACC and Cost of Equity", "Discounted Cash Flow — Cost of Capital"],
  6: ["DCF", "Discounted Cash Flow"],
  7: ["Merger Models", "Mergers & Acquisitions"],
  8: ["LBO Models", "Leveraged Buyouts"],
  9: ["Debt & Leveraged Finance", "Leveraged Finance"],
  10: ["Industry-specific valuation", "Industry Valuation"],
  11: ["Brain teasers / mental math", "Brain Teasers"],
};

const DIFF_FROM_TAG: Record<string, "core" | "follow-up" | "advanced"> = { "🟢": "core", "🟡": "follow-up", "🔴": "advanced" };

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function firstSentence(s: string, max = 150): string {
  const plain = s.replace(/\*\*|\*|_/g, "").trim();
  const m = /^(.+?[.!?])(\s|$)/.exec(plain);
  const out = (m ? m[1] : plain).trim();
  return out.length > max ? `${out.slice(0, max - 1).trimEnd()}…` : out;
}

/* ─────────── 1. split the document into lessons ─────────── */

type RawLesson = { id: string; module: number; title: string; difficulty: "core" | "follow-up" | "advanced"; body: string };

function splitLessons(): RawLesson[] {
  const out: RawLesson[] = [];
  const re = /^## (\d+)\.(\d+) (.+?)\s*(🟢|🟡|🔴)?\s*$/gm;
  const heads = Array.from(SRC.matchAll(re));
  heads.forEach((h, i) => {
    const start = (h.index ?? 0) + h[0].length;
    const nextHead = heads[i + 1]?.index ?? SRC.length;
    const nextModule = SRC.slice(start).search(/^# /m);
    const end = Math.min(nextHead, nextModule >= 0 ? start + nextModule : SRC.length);
    out.push({
      id: `${Number(h[1])}-${Number(h[2])}`,
      module: Number(h[1]),
      title: h[3].trim(),
      difficulty: DIFF_FROM_TAG[h[4] ?? "🟢"] ?? "core",
      body: SRC.slice(start, end).replace(/\n---\s*$/m, "").trim(),
    });
  });
  return out;
}

/** Splits a lesson body into its **Walkthrough** / **Fill-ins** / **Deep dives** / **Checkpoint:** sections. */
function sections(body: string) {
  const out: Record<string, string> = {};
  const re = /^\*\*(Walkthrough|Fill-ins|Deep dives|Checkpoint:)\*\*(.*)$/gm;
  const marks = Array.from(body.matchAll(re));
  marks.forEach((m, i) => {
    const key = m[1].replace(":", "");
    const start = (m.index ?? 0) + m[0].length;
    const end = marks[i + 1]?.index ?? body.length;
    out[key] = (key === "Checkpoint" ? m[2] : "") + body.slice(start, end);
    out[key] = out[key].trim();
  });
  return out;
}

/* ─────────── 2. walkthrough ─────────── */

/** Pointers in the content that name a section inside a tab rather than a tab (checked against the .xlsx files). */
const SECTION_IN_TAB: Record<string, string> = {
  "Purchase price allocation": "Merger Model",
  "Returns attribution": "LBO",
  "Cross-checks": "DCF",
};

/** "Practice in PEB_02 "Diluted Shares."", "Work it in PEB_02 "EV Bridge."", "Build it in PEB_06." … */
const PRACTICE_RE = /\b(Practice|Build|Work|Calculate|Toggle)\b([^.]*?)\bPEB_0(\d)\b(?:\s+"([^"]*?)\.?")?\.?/;

/** Pulls workbook pointers out of text; returns cleaned text + readable notes for the workbook card. */
function extractPractice(text: string): { text: string; notes: string[]; workbooks: string[] } {
  const notes: string[] = [];
  const workbooks: string[] = [];
  let t = text;
  for (let m = PRACTICE_RE.exec(t); m; m = PRACTICE_RE.exec(t)) {
    const [whole, verb, middle, digit, tab] = m;
    const wb = WORKBOOK_BY_PREFIX[`PEB_0${digit}`];
    if (wb) workbooks.push(wb);
    const phrase = `${verb}${middle}`.replace(/\s+(in|with workbook|with)\s*$/i, "").trim();
    const inTab = tab ? SECTION_IN_TAB[tab] : undefined;
    notes.push(
      !tab
        ? `${phrase} in the workbook.`
        : inTab
          ? `${phrase} in the “${tab}” section of the “${inTab}” tab.`
          : `${phrase} in the “${tab}” tab.`,
    );
    t = (t.slice(0, m.index) + t.slice(m.index + whole.length)).replace(/[ \t]{2,}/g, " ").trim();
  }
  return { text: t, notes, workbooks };
}

function walkthroughBlocks(src: string, nextId: () => string, practice: { notes: string[]; workbooks: string[] }): Block[] {
  const blocks: Block[] = [];
  const lines = src.split("\n");
  const intro: string[] = [];
  const steps: string[] = [];
  const outro: string[] = [];
  let mode: "intro" | "steps" | "outro" = "intro";
  let isTableOrBullets = false;
  for (const line of lines) {
    if (/^\d+\.\s+/.test(line)) {
      mode = "steps";
      steps.push(line.replace(/^\d+\.\s+/, ""));
    } else if (mode === "steps" && line.trim() && !/^\d+\.\s/.test(line)) {
      mode = "outro";
      outro.push(line);
    } else if (mode === "outro" || (mode === "steps" && !line.trim())) {
      if (mode === "outro") outro.push(line);
    } else {
      if (/^\s*[-|]/.test(line)) isTableOrBullets = true;
      intro.push(line);
    }
  }

  const pushText = (text: string) => {
    const ex = extractPractice(text.trim());
    practice.notes.push(...ex.notes);
    practice.workbooks.push(...ex.workbooks);
    if (ex.text.trim()) blocks.push({ type: "text", id: nextId(), body: ex.text.trim() });
  };

  if (intro.join("\n").trim()) {
    // Tables and bullet lists stay as one Markdown block; plain paragraphs too.
    if (isTableOrBullets) {
      const joined = intro.join("\n").trim();
      const ex = extractPractice(joined.split("\n").filter((l) => !PRACTICE_RE.test(l) || /\|/.test(l)).join("\n"));
      for (const l of intro) if (PRACTICE_RE.test(l) && !/\|/.test(l)) {
        const e2 = extractPractice(l);
        practice.notes.push(...e2.notes);
        practice.workbooks.push(...e2.workbooks);
      }
      if (ex.text.trim()) blocks.push({ type: "text", id: nextId(), body: ex.text.trim() });
    } else {
      pushText(intro.join("\n"));
    }
  }

  const cleanSteps = steps
    .map((s) => {
      const ex = extractPractice(s);
      practice.notes.push(...ex.notes);
      practice.workbooks.push(...ex.workbooks);
      return ex.text.trim();
    })
    .filter(Boolean);

  if (cleanSteps.length === 1) {
    blocks.push({ type: "text", id: nextId(), body: cleanSteps[0] });
  } else if (cleanSteps.length > 1) {
    blocks.push({
      type: "stepThrough",
      id: nextId(),
      title: "Walk through it",
      steps: cleanSteps.map((s) => {
        // "**Income statement:** revenue…" → heading + body. Bold without a colon stays in the body.
        const m = /^\*\*([^*]+?):\*\*\s*(.+)$/.exec(s) ?? /^\*\*([^*]+?)\*\*:\s*(.+)$/.exec(s);
        if (m) return { heading: m[1], body: m[2] };
        return { body: s };
      }),
    });
  }
  if (outro.join("\n").trim()) pushText(outro.join("\n"));
  return blocks;
}

/* ─────────── 3. fill-ins ─────────── */

const SYNONYMS: Record<string, string[]> = {
  falls: ["decreases", "declines", "goes down", "drops", "decrease", "fall", "lower", "down"],
  lower: ["less", "decreases", "smaller", "falls"],
  higher: ["more", "greater", "increases", "larger", "rises"],
  increases: ["rises", "goes up", "increase", "higher", "up", "grows"],
  decreases: ["falls", "declines", "goes down", "decrease", "lower", "down", "drops"],
  reduces: ["decreases", "lowers", "reduce", "lower"],
  reduced: ["decreased", "lowered", "reduces", "lower"],
  zero: ["0", "nil"],
  "greater than": ["higher than", "above", "more than", ">"],
  "greater than or equal to": ["at least", ">=", "≥", "equal to or greater than", "greater or equal to"],
  use: ["a use", "outflow", "use of cash"],
  source: ["a source", "inflow", "source of cash"],
  equity: ["shareholders equity", "stockholders equity", "owners equity", "shareholders' equity"],
  "point in time": ["a point in time", "single point in time", "specific date"],
  period: ["a period", "period of time", "time period"],
  "opportunity cost": ["required return", "opportunity cost of capital"],
  "do not": ["don't", "dont", "never", "do not amortize"],
  "not permitted": ["not allowed", "prohibited", "banned", "not permitted under ifrs"],
  unchanged: ["no change", "the same", "flat", "same", "no impact"],
  none: ["no impact", "no effect", "nothing", "zero", "0"],
  "in-the-money": ["in the money", "itm"],
  shares: ["equity", "share count", "diluted shares"],
  median: ["the median"],
  "limited liability": ["limited-liability"],
  "control premium": ["a control premium", "premium for control"],
  floor: ["the floor", "minimum", "low end"],
  intrinsic: ["intrinsic valuation"],
  relative: ["relative valuation"],
  ranges: ["a range", "range", "value ranges"],
  "reference point": ["a reference point", "reference", "benchmark"],
  "nominal gdp": ["gdp", "nominal gdp growth", "gdp growth", "long-run gdp"],
  "neither accretive nor dilutive": ["breakeven", "eps neutral", "neutral", "neither"],
  plug: ["the plug", "balancing item", "residual"],
  "written off": ["written-off", "eliminated", "removed", "wiped out"],
  "dividend discount": ["ddm", "dividend discount model"],
  "common equity": ["equity", "common stock", "common shareholders"],
  collateral: ["specific collateral", "assets"],
  more: ["higher", "greater"],
  above: ["higher than", "over", "greater than"],
  equal: ["equals", "be equal", "match"],
  "less equity": ["a smaller equity check", "less of its own money", "less capital"],
  "net debt": ["remaining net debt", "debt"],
  "yield to maturity": ["ytm"],
  "interest income": ["interest", "foregone interest", "interest it would have earned"],
  "earnings yield": ["inverse p/e", "1/pe", "1 / p/e", "e/p"],
  principal: ["the principal", "principal balance"],
  "cost of equity": ["re", "the cost of equity"],
  "equity value": ["equity"],
  wacc: ["weighted average cost of capital"],
  "enterprise value": ["ev"],
  "tax rate": ["t", "tax", "the tax rate"],
  unlevered: ["unlevered fcf", "unlevered free cash flow"],
  market: ["market values"],
  ebitda: ["ebitda"],
  "net income": ["ni", "earnings"],
  ebit: ["operating income", "operating profit"],
  nopat: ["net operating profit after tax", "net operating profit after taxes"],
  earned: ["it is earned", "delivered", "performed"],
  dividends: ["dividend", "dividends paid"],
  cash: ["cash and equivalents"],
  debt: ["borrowings"],
  liability: ["a liability", "deferred tax liability", "dtl"],
  asset: ["an asset", "deferred tax asset", "dta"],
  acquisitions: ["acquisition", "m&a", "buying companies"],
  "non-cash": ["noncash", "non cash"],
  depreciation: ["d&a", "depreciation expense"],
  interest: ["interest expense"],
  "valuation allowance": ["an allowance", "valuation reserve"],
  subtracted: ["subtract", "deducted", "minus", "removed", "taken out", "less"],
  added: ["add", "plus", "included", "added back"],
  diluted: ["fully diluted"],
  all: ["all investors", "every investor"],
};

function synonymsFor(answer: string): string[] {
  const key = answer.toLowerCase().trim();
  return SYNONYMS[key] ?? [];
}

/** "−$6" → { value: -6, unit: "$" }; returns null for non-numeric answers. */
function numericAnswer(raw: string): { value: number; unit?: string; decimals: number } | null {
  const s = raw.trim().replace(/−/g, "-");
  const m = /^([+-])?\s*(\$)?\s*([\d,]*\.?\d+)\s*(%|x)?$/.exec(s);
  if (!m) return null;
  const num = Number(m[3].replace(/,/g, ""));
  if (!Number.isFinite(num)) return null;
  const decimals = (m[3].split(".")[1] ?? "").length;
  return { value: m[1] === "-" ? -num : num, unit: m[2] ? "$" : m[4], decimals };
}

function toleranceFor(n: { value: number; decimals: number; unit?: string }): number {
  if (n.decimals > 0) return Math.max(0.5 * 10 ** -n.decimals, 0.005);
  if (n.unit === "%") return 0.5;
  return Math.abs(n.value) >= 1000 ? 1 : 0;
}

function textAnswerAccept(raw: string): string[] {
  const base = raw.trim();
  const out = new Set<string>([base]);
  for (const s of synonymsFor(base)) out.add(s);
  // Ranges like "5–10", "60–80%".
  const range = /^(\d+)\s*[–-]\s*(\d+)(%)?$/.exec(base);
  if (range) {
    const [, a, b, pct] = range;
    for (const v of [`${a}-${b}`, `${a} to ${b}`, `${a}-${b}${pct ?? ""}`, `${a}${pct ?? ""}-${b}${pct ?? ""}`, `${a}${pct ?? ""} to ${b}${pct ?? ""}`])
      out.add(v);
  }
  // "≥ 40%"
  const gte = /^≥\s*(\d+)(%)?$/.exec(base);
  if (gte) for (const v of [`${gte[1]}%`, gte[1], `>= ${gte[1]}%`, `at least ${gte[1]}%`, `40% or more`]) out.add(v);
  // "up $100" / "down $50"
  const dir = /^(up|down)\s+\$?(\d+)$/i.exec(base);
  if (dir) {
    const n = dir[2];
    const sign = dir[1].toLowerCase() === "up" ? "+" : "-";
    for (const v of [`${sign}${n}`, `${sign}$${n}`, `${dir[1]} ${n}`, `${dir[1].toLowerCase() === "up" ? "increases" : "decreases"} by ${n}`, `${dir[1].toLowerCase() === "up" ? "rises" : "falls"} by ${n}`])
      out.add(v);
  }
  return Array.from(out);
}

function signedNumberAccept(n: { value: number }): string[] {
  const abs = Math.abs(n.value);
  if (n.value < 0) return [`down ${abs}`, `down $${abs}`, `decreases by ${abs}`, `falls by ${abs}`, `minus ${abs}`];
  return [`up ${abs}`, `up $${abs}`, `increases by ${abs}`, `rises by ${abs}`, `plus ${abs}`];
}

function fillInBlock(line: string, nextId: () => string): Block {
  // Trailing parenthetical worked solution, e.g. "**0.93** (1.30 ÷ 1.40)"
  const paren = /\*\*\s*(\([^)]*\))\s*$/.exec(line);
  const work = paren ? paren[1].slice(1, -1) : undefined;
  const text = paren ? line.slice(0, paren.index + 2).trim() : line.trim();
  const bolds = Array.from(text.matchAll(/\*\*(.+?)\*\*/g));
  const last = bolds[bolds.length - 1];
  const endsWithBold = last && (last.index ?? 0) + last[0].length >= text.length;

  // Single numeric answer at the end → calc block.
  if (bolds.length === 1 && endsWithBold) {
    const n = numericAnswer(last[1]);
    if (n) {
      const before = text.slice(0, last.index).trim().replace(/\s*(→|=)\s*$/, (m) => ` ${m.trim()}`);
      return {
        type: "calc",
        id: nextId(),
        prompt: `${before} **?**`,
        answer: n.value,
        tolerance: toleranceFor(n),
        ...(n.unit ? { unit: n.unit } : {}),
        solution: `${text.replace(/\*\*/g, "")}${work ? ` (${work})` : ""}`,
      };
    }
  }

  let k = 0;
  const blanks: Record<string, Json> = {};
  const template = text.replace(/\*\*(.+?)\*\*/g, (_, ans: string) => {
    k += 1;
    const key = String(k);
    const n = numericAnswer(ans);
    if (n) {
      const signed = /^\s*[+\-−]/.test(ans);
      blanks[key] = {
        numeric: n.value,
        tolerance: toleranceFor(n),
        accept: [ans.trim(), ...(signed ? signedNumberAccept(n) : [])],
        hint: work ?? (signed ? "Include the direction: use + or − (e.g. −6)." : "Enter a number."),
      };
    } else {
      blanks[key] = { accept: textAnswerAccept(ans), hint: `Starts with “${ans.trim().charAt(0).toUpperCase()}”.` };
    }
    return `{{${key}}}`;
  });
  return { type: "fillBlank", id: nextId(), prompt: "Fill in the blank", template, blanks };
}

/* ─────────── 4. deep dives ─────────── */

type Dive = { title: string; tag: string; body: string; sayIt?: string };

function parseDives(src: string): Dive[] {
  const out: Dive[] = [];
  let cur: Dive | null = null;
  for (const line of src.split("\n")) {
    const head = /^- \*\*(.+?)\*\*\s*(🟢|🟡|🔴)?\s*(.*)$/.exec(line);
    if (head) {
      if (cur) out.push(cur);
      cur = { title: head[1].trim(), tag: head[2] ?? "🟡", body: head[3]?.replace(/^—\s*/, "").trim() ?? "" };
      continue;
    }
    if (!cur) continue;
    const say = /^\s+\*Say it:\*\s*(.+)$/.exec(line);
    if (say) {
      cur.sayIt = say[1].trim();
      continue;
    }
    if (line.trim()) cur.body = `${cur.body ? `${cur.body}\n\n` : ""}${line.trim()}`;
  }
  if (cur) out.push(cur);
  return out;
}

function diveDifficulty(d: Dive): "core" | "follow-up" | "gotcha" | "advanced" {
  if (d.tag === "🟢") return "core";
  if (d.tag === "🟡") return "follow-up";
  // 🔴: trick questions (yes/no "can/is/does/should…?") are gotchas; the rest are advanced.
  return /^(Can|Is|Does|Should|Are|Do)\b/.test(d.title.replace(/^["“]/, "")) ? "gotcha" : "advanced";
}

function diveBlock(d: Dive, id: string): Block {
  const body = [d.body, d.sayIt ? `**Interview answer:** ${d.sayIt}` : ""].filter(Boolean).join("\n\n");
  return {
    type: "deepDive",
    id,
    title: d.title.replace(/^"(.+)"$/, "“$1”"),
    difficulty: diveDifficulty(d),
    teaser: d.body ? firstSentence(d.body) : "Includes a model interview answer",
    body,
  };
}


/** Render acronyms (WACC, UFCF, EBITDA…) upright instead of as italic letter products. */
function prettifyLatex(tex: string): string {
  let out = "";
  let i = 0;
  while (i < tex.length) {
    // Leave \text{...} groups untouched.
    if (tex.startsWith("\\text{", i)) {
      let depth = 0;
      let j = i + 5;
      for (; j < tex.length; j++) {
        if (tex[j] === "{") depth++;
        else if (tex[j] === "}" && --depth === 0) break;
      }
      out += tex.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (tex[i] === "\\") {
      const m = /^\\[a-zA-Z]+|^\\./.exec(tex.slice(i));
      out += m ? m[0] : tex[i];
      i += m ? m[0].length : 1;
      continue;
    }
    const word = /^(D\\&A|[A-Z][A-Za-z]*[A-Z][A-Za-z]*|CapEx)/.exec(tex.slice(i));
    if (word) {
      out += `\\text{${word[0]}}`;
      i += word[0].length;
      continue;
    }
    out += tex[i++];
  }
  return out;
}

/* ─────────── 5. assemble ─────────── */

function estMinutes(blocks: Block[]): number {
  const words = JSON.stringify(blocks).split(/\s+/).length;
  const interactive = blocks.filter((b) => ["fillBlank", "calc", "mcq", "orderSteps", "checkpoint"].includes(b.type)).length;
  return Math.max(10, Math.round((words / 180 + interactive * 1.5) / 5) * 5);
}

function mcqBlock(lessonId: string, id: string): Block | null {
  const m = MCQS[lessonId];
  if (!m) return null;
  const ids = ["a", "b", "c", "d"];
  return {
    type: "mcq",
    id,
    prompt: m.prompt,
    options: m.options.map((text, i) => ({ id: ids[i], text })),
    correct: ids[m.correct],
    explanation: m.explanation,
  };
}

function convert(raw: RawLesson, prevId: string | null): Json {
  let n = 0;
  const nextId = () => `b${++n}`;
  const sec = sections(raw.body);
  const practice = { notes: [] as string[], workbooks: [] as string[] };
  const blocks: Block[] = [];

  if (sec.Walkthrough) blocks.push(...walkthroughBlocks(sec.Walkthrough, nextId, practice));
  for (const f of FORMULAS[raw.id] ?? []) {
    blocks.push({
      type: "formula",
      id: nextId(),
      ...f,
      latex: prettifyLatex(f.latex),
      legend: f.legend.map((l) => ({ ...l, symbol: prettifyLatex(l.symbol) })),
    });
  }

  if (sec["Fill-ins"]) {
    for (const line of sec["Fill-ins"].split("\n")) {
      const l = line.replace(/^-\s+/, "").trim();
      if (!l || !/\*\*/.test(l)) continue;
      blocks.push(fillInBlock(l, nextId));
    }
  }

  const mcq = MCQS[raw.id];
  let mcqPlaced = false;
  if (sec["Deep dives"]) {
    for (const d of parseDives(sec["Deep dives"])) {
      // Workbook mentions inside deep dives still count as "the lesson mentions a workbook".
      const pfx = /PEB_0\d/.exec(d.body)?.[0];
      if (pfx && WORKBOOK_BY_PREFIX[pfx]) practice.workbooks.push(WORKBOOK_BY_PREFIX[pfx]);
      blocks.push(diveBlock(d, nextId()));
      if (mcq && !mcqPlaced && d.title.toLowerCase().includes(mcq.after.toLowerCase())) {
        const b = mcqBlock(raw.id, nextId());
        if (b) blocks.push(b);
        mcqPlaced = true;
      }
    }
  }
  if (mcq && !mcqPlaced) {
    throw new Error(`MCQ for ${raw.id} references deep dive "${mcq.after}" which wasn't found`);
  }

  const prompts = (sec.Checkpoint ?? "")
    .split(/\s+·\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (prompts.length) blocks.push({ type: "checkpoint", id: nextId(), title: "Say it out loud", prompts, selfGrade: true });

  const mapped = Object.entries(WORKBOOK_MAP).find(([, ids]) => ids.includes(raw.id))?.[0];
  const workbook = mapped ?? practice.workbooks[0];
  if (workbook) {
    const notes = Array.from(new Set(practice.notes));
    blocks.push({
      type: "excelLink",
      id: nextId(),
      workbook,
      body: notes.length ? notes.join(" ") : "Practice this lesson's mechanics in the matching workbook.",
    });
  }

  const [biws, wsp] = SOURCE_SECTIONS[raw.module];
  return {
    id: raw.id,
    slug: slugify(raw.title),
    module: raw.module,
    moduleTitle: MODULE_TITLES[raw.module],
    title: raw.title.replace(/^"(.+)"(.*)$/, "“$1”$2"),
    difficulty: raw.difficulty,
    estMinutes: estMinutes(blocks),
    prerequisites: prevId ? [prevId] : [],
    relatedQuestionTags: TAGS[raw.id] ?? [],
    ...(workbook ? { workbook } : {}),
    sourceRefs: [
      { guide: "BIWS 400 Questions", section: biws },
      { guide: "WSP Red Book", section: wsp },
    ],
    objectives: prompts.map((p) => `Answer out loud: ${p}`),
    blocks,
  };
}

/** 5-2 keeps its hand-built JSON; append the two "Additional deep dive to add" items before the order-steps block. */
function patchLesson52(raw: RawLesson) {
  const file = path.join(OUT, "5-2-capm-and-beta.json");
  const lesson = JSON.parse(readFileSync(file, "utf8")) as Json & { blocks: Block[] };
  const sec = sections(raw.body);
  const extra = parseDives(sec["Deep dives"] ?? "")
    .filter((d) => d.title.startsWith("Additional deep dive to add — "))
    .map((d) => ({ ...d, title: d.title.replace("Additional deep dive to add — ", "") }));
  const existingTitles = new Set(lesson.blocks.filter((b) => b.type === "deepDive").map((b) => String(b.title)));
  let maxId = Math.max(...lesson.blocks.map((b) => Number(String(b.id).slice(1)) || 0));
  const toAdd = extra.filter((d) => !existingTitles.has(d.title)).map((d) => diveBlock(d, `b${++maxId}`));
  if (toAdd.length) {
    const at = lesson.blocks.findIndex((b) => b.type === "orderSteps");
    lesson.blocks.splice(at >= 0 ? at : lesson.blocks.length, 0, ...toAdd);
    writeFileSync(file, `${JSON.stringify(lesson, null, 2)}\n`);
  }
  return toAdd.length;
}

const lessons = splitLessons();
let prev: string | null = null;
let written = 0;
for (const raw of lessons) {
  if (raw.id === "5-2") {
    const added = patchLesson52(raw);
    console.log(`5-2: kept hand-built lesson, added ${added} deep dive(s)`);
  } else {
    const json = convert(raw, prev);
    writeFileSync(path.join(OUT, `${json.id}-${json.slug}.json`), `${JSON.stringify(json, null, 2)}\n`);
    written++;
  }
  prev = raw.id;
}
console.log(`Converted ${written} lessons (${lessons.length} total in source).`);
