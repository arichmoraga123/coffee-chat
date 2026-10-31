import type { BlockOf } from "./schema";

/** Shared by the browser (instant feedback) and the server (authoritative grading + XP). */

/** Case-insensitive, trimmed, punctuation-stripped comparison text. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’“”"'`]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[^\p{L}\p{N}%\-+./ ]+/gu, " ")
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?]+$/g, "")
    .trim();
}

/** Parses "$1,275", "10.6%", "2.5x", "−6", "(6)" → number. Returns null when it isn't a number. */
export function parseNumeric(input: string): number | null {
  let s = input.trim().replace(/[−–]/g, "-");
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/^~|^≈|^about\s+/i, "").replace(/[$€£,\s]/g, "").replace(/(%|x|×|bps?)$/i, "");
  if (s.startsWith("-")) {
    neg = !neg;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }
  if (!/^\d*\.?\d+$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

export function numericMatches(input: string, answer: number, tolerance = 0): boolean {
  const n = parseNumeric(input);
  if (n === null) return false;
  return Math.abs(n - answer) <= tolerance + 1e-9;
}

type Blank = BlockOf<"fillBlank">["blanks"][string];

export function gradeBlank(input: string, blank: Blank): boolean {
  if (!input.trim()) return false;
  if (typeof blank.numeric === "number" && numericMatches(input, blank.numeric, blank.tolerance ?? 0)) return true;
  if (blank.accept?.length) {
    const v = normalizeText(input);
    return blank.accept.some((a) => normalizeText(a) === v);
  }
  return false;
}

/** Per-blank results for a fill-in block. */
export function gradeFillBlank(block: BlockOf<"fillBlank">, answers: Record<string, string>) {
  const results: Record<string, boolean> = {};
  for (const [k, blank] of Object.entries(block.blanks)) results[k] = gradeBlank(answers[k] ?? "", blank);
  return { results, correct: Object.values(results).every(Boolean) };
}

export function gradeCalc(block: BlockOf<"calc">, input: string): boolean {
  return numericMatches(input, block.answer, block.tolerance ?? 0);
}

export function gradeMcq(block: BlockOf<"mcq">, optionId: string): boolean {
  return optionId === block.correct;
}

/** `order` is the item list in the student's order; correct when it matches the authored order. */
export function gradeOrder(block: BlockOf<"orderSteps">, order: string[]) {
  const positions = block.items.map((item, i) => order[i] === item);
  return { positions, correct: order.length === block.items.length && positions.every(Boolean) };
}

/** Deterministic shuffle so a student sees the same option order every visit. */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const rand = () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
