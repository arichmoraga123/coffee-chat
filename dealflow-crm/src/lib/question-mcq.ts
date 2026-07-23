export type McqDistractorSource = { id: string; answer: string; category: string };

export type McqOption = { key: string; text: string; isCorrect: boolean };

/** Display cap — only truncate beyond this at a sentence boundary. */
const MCQ_ANSWER_MAX_LEN = 400;

/**
 * Categories often studied together; used for distractors when same-category pool is thin.
 * (e.g. LBO ↔ Valuation / DCF / merger math)
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
];

function adjacentCategories(category: string): Set<string> {
  const out = new Set<string>();
  for (const cluster of MCQ_CATEGORY_CLUSTERS) {
    if (!cluster.includes(category)) continue;
    for (const c of cluster) {
      if (c !== category) out.add(c);
    }
  }
  return out;
}

/** Normalize whitespace for MCQ choice display and deduplication. */
export function normalizeMcqAnswerText(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

/**
 * Truncates only when text exceeds `max` (default 400) and only at a complete
 * sentence boundary (. ? !). Returns full text otherwise — never mid-word cuts.
 */
export function truncateAnswerForMcq(s: string, max = MCQ_ANSWER_MAX_LEN): string {
  const t = normalizeMcqAnswerText(s);
  if (t.length <= max) return t;

  const slice = t.slice(0, max);

  let bestSentenceEnd = -1;
  for (let i = slice.length - 1; i >= 0; i--) {
    const ch = slice[i];
    if (ch !== "." && ch !== "!" && ch !== "?") continue;
    const after = slice[i + 1];
    if (after === undefined || after === " ") {
      bestSentenceEnd = i;
      break;
    }
  }

  if (bestSentenceEnd >= 0) {
    const atSentence = slice.slice(0, bestSentenceEnd + 1).trim();
    if (atSentence.length > 0) {
      return atSentence.length < t.length ? `${atSentence}…` : atSentence;
    }
  }

  // No sentence boundary within limit — show full text rather than clip mid-sentence.
  return t;
}

/** @deprecated Use truncateAnswerForMcq — kept for any external imports */
export function truncateAnswer(s: string, max = MCQ_ANSWER_MAX_LEN): string {
  return truncateAnswerForMcq(s, max);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * One correct + three wrong answers (same category → adjacent categories → rest), shuffled.
 * Choice text is shown in full (no truncation under 400 chars).
 */
export function buildMcqOptions(
  current: McqDistractorSource,
  pool: McqDistractorSource[],
): McqOption[] {
  const correctText = normalizeMcqAnswerText(current.answer);
  const wrongPool = pool.filter((q) => q.id !== current.id);
  const picked: string[] = [];

  const tryAdd = (raw: string) => {
    const t = normalizeMcqAnswerText(raw);
    if (!t || t === correctText || picked.includes(t)) return false;
    picked.push(t);
    return true;
  };

  const cat = current.category.trim();
  const adjacent = adjacentCategories(cat);

  const sameCat = shuffle(wrongPool.filter((q) => q.category.trim() === cat));
  for (const q of sameCat) {
    if (picked.length >= 3) break;
    tryAdd(q.answer);
  }

  const adjCat = shuffle(
    wrongPool.filter((q) => {
      const c = q.category.trim();
      return c !== cat && adjacent.has(c);
    }),
  );
  for (const q of adjCat) {
    if (picked.length >= 3) break;
    tryAdd(q.answer);
  }

  const rest = shuffle(
    wrongPool.filter((q) => {
      const c = q.category.trim();
      return c !== cat && !adjacent.has(c);
    }),
  );
  for (const q of rest) {
    if (picked.length >= 3) break;
    tryAdd(q.answer);
  }

  for (const q of shuffle(wrongPool)) {
    if (picked.length >= 3) break;
    tryAdd(q.answer);
  }

  while (picked.length < 3) {
    picked.push(`(Alternative perspective ${picked.length + 1})`);
  }

  const opts: McqOption[] = [
    { key: "c", text: correctText, isCorrect: true },
    ...picked.slice(0, 3).map((text, i) => ({ key: `w${i}`, text, isCorrect: false })),
  ];
  return shuffle(opts);
}

/** Shared Tailwind classes for MCQ answer choice buttons. */
export const MCQ_CHOICE_BUTTON_CLASS =
  "w-full h-auto min-h-[60px] overflow-visible whitespace-normal break-words rounded-xl border px-4 py-3 text-left text-sm leading-relaxed sm:text-[15px]";
