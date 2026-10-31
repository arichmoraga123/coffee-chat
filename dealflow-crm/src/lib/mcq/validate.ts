/** Rules every MCQ must pass — shared by the admin editor, the seed and `npm run validate-questions`. */

export type McqInput = {
  question: string;
  options: string[];
  correctIndex: number | null | undefined;
  explanation?: string | null;
  difficulty?: string | null;
};

export const MCQ_DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

export function validateMcq(q: McqInput): string[] {
  const errors: string[] = [];
  if (!q.question?.trim()) errors.push("Question text is blank");
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    errors.push("Needs exactly 4 options");
  } else {
    q.options.forEach((o, i) => {
      if (!o?.trim()) errors.push(`Option ${"ABCD"[i]} is blank`);
    });
    const seen = new Map<string, number>();
    q.options.forEach((o, i) => {
      if (!o?.trim()) return;
      const k = norm(o);
      if (seen.has(k)) errors.push(`Options ${"ABCD"[seen.get(k)!]} and ${"ABCD"[i]} are duplicates`);
      else seen.set(k, i);
    });
  }
  if (typeof q.correctIndex !== "number" || !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) {
    errors.push("Mark exactly one option as correct");
  }
  if (q.explanation !== undefined && !q.explanation?.trim()) errors.push("Explanation is blank");
  if (q.difficulty && !MCQ_DIFFICULTIES.includes(q.difficulty as (typeof MCQ_DIFFICULTIES)[number])) {
    errors.push(`Difficulty must be ${MCQ_DIFFICULTIES.join(", ")}`);
  }
  return errors;
}

/** "2.2" or "2-2" → "2-2" (the Learn lesson id format). */
export function toLessonId(raw: string | null | undefined): string | null {
  const m = /^(\d{1,2})[.-](\d{1,2})$/.exec((raw ?? "").trim());
  return m ? `${Number(m[1])}-${Number(m[2])}` : null;
}

export function capitalizeDifficulty(raw: string): string {
  const d = raw.trim().toLowerCase();
  return d.charAt(0).toUpperCase() + d.slice(1);
}
