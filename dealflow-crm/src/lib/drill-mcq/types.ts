/**
 * Drill-style multiple choice: one correct answer and three "near-miss" distractors
 * that differ from it by one key detail (a sign, a number, a direction, a term).
 *
 * - `c`: the correct choice
 * - `w`: three plausible-but-wrong choices, similar length and wording to `c`
 * - `why`: optional one-liner explaining the trap, shown after answering
 * - `stem`: optional MCQ-specific prompt (e.g. adds an assumption like a tax rate)
 */
export type DrillMcq = {
  c: string;
  w: [string, string, string];
  why?: string;
  stem?: string;
};

export type DrillMcqMap = Record<string, DrillMcq>;

/** Lookup key: case/whitespace-insensitive question text. */
export function mcqKey(question: string): string {
  return question.trim().toLowerCase().replace(/\s+/g, " ");
}
