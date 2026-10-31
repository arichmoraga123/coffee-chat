import type { DrillMcq } from "@/lib/drill-mcq/types";

export type McqDistractorSource = { id: string; answer: string; category: string };

export type McqOption = { key: string; text: string; isCorrect: boolean };

/** Normalize whitespace for MCQ choice display and deduplication. Never truncates. */
export function normalizeMcqAnswerText(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Drill-style options from hand-authored or AI-generated near-miss choices. */
export function buildMcqFromDrill(mcq: DrillMcq): McqOption[] {
  return shuffle([
    { key: "c", text: normalizeMcqAnswerText(mcq.c), isCorrect: true },
    ...mcq.w.map((text, i) => ({ key: `w${i}`, text: normalizeMcqAnswerText(text), isCorrect: false })),
  ]);
}

/**
 * Categories often studied together; used for fallback distractors when same-category pool is thin.
 */
const MCQ_CATEGORY_CLUSTERS: string[][] = [
  ["LBO Models", "Valuation", "DCF", "Merger Models", "Equity Value & Enterprise Value"],
  ["Accounting", "Finance Concepts", "Equity Value & Enterprise Value"],
  ["Behavioral", "Consulting - Behavioral", "Finance Concepts"],
  ["Consulting", "Consulting - Behavioral", "Consulting - Case Math", "Finance Concepts"],
  ["Capital Markets", "Finance Concepts", "Valuation"],
  ["Asset Management", "Valuation", "Finance Concepts"],
  ["Wealth Management", "Asset Management", "Finance Concepts"],
  ["Big 4 Accounting", "Accounting", "Finance Concepts"],
  ["Restructuring", "Credit", "Finance Concepts"],
];

function adjacentCategories(category: string): Set<string> {
  const out = new Set<string>();
  for (const cluster of MCQ_CATEGORY_CLUSTERS) {
    if (!cluster.includes(category)) continue;
    for (const c of cluster) if (c !== category) out.add(c);
  }
  return out;
}

/**
 * Last-resort fallback when no drill choices exist (and AI generation is unavailable):
 * one correct answer + three answers from related questions, preferring similar lengths
 * so the correct one doesn't stand out. Full text, never truncated.
 */
export function buildMcqOptions(current: McqDistractorSource, pool: McqDistractorSource[]): McqOption[] {
  const correctText = normalizeMcqAnswerText(current.answer);
  const target = correctText.length;
  const cat = current.category.trim();
  const adjacent = adjacentCategories(cat);

  const candidates = pool
    .filter((q) => q.id !== current.id)
    .map((q) => ({ text: normalizeMcqAnswerText(q.answer), cat: q.category.trim() }))
    .filter((q) => q.text && q.text !== correctText);

  const tier = (c: string) => (c === cat ? 0 : adjacent.has(c) ? 1 : 2);
  // Prefer same topic, then closest length (random tiebreak).
  const ranked = shuffle(candidates).sort(
    (a, b) => tier(a.cat) - tier(b.cat) || Math.abs(a.text.length - target) - Math.abs(b.text.length - target),
  );

  const picked: string[] = [];
  for (const c of ranked) {
    if (picked.length >= 3) break;
    if (!picked.includes(c.text)) picked.push(c.text);
  }

  return shuffle([
    { key: "c", text: correctText, isCorrect: true },
    ...picked.map((text, i) => ({ key: `w${i}`, text, isCorrect: false })),
  ]);
}

/** Shared Tailwind classes for MCQ answer choice buttons (wraps long text, never clips). */
export const MCQ_CHOICE_BUTTON_CLASS =
  "w-full h-auto min-h-[60px] overflow-visible whitespace-normal break-words [overflow-wrap:anywhere] rounded-xl border px-4 py-3 text-left text-sm leading-relaxed sm:text-[15px]";
