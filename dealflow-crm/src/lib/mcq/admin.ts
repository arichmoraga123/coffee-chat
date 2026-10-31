import { getLesson } from "@/lib/learn/lessons";
import { toLessonId, validateMcq } from "./validate";

type Existing = {
  question: string;
  options: string[];
  correctIndex: number | null;
  explanation: string | null;
  difficulty: string;
  lessonId: string | null;
  mcqEligible: boolean;
};

/**
 * Reads the MCQ fields from an admin create/edit request and checks them with the same rules as the seed.
 * A question can only be MCQ-eligible if it has 4 distinct options, one correct answer and an explanation.
 */
export function parseMcqFields(
  body: Record<string, unknown>,
  existing?: Existing,
): { errors: string[]; data: Record<string, unknown> } {
  const data: Record<string, unknown> = {};
  const errors: string[] = [];

  if (Array.isArray(body.options)) data.options = body.options.map((o) => String(o ?? "").trim());
  if (body.correctIndex === null || typeof body.correctIndex === "number") data.correctIndex = body.correctIndex;
  if (typeof body.explanation === "string" || body.explanation === null) {
    data.explanation = typeof body.explanation === "string" ? body.explanation.trim() || null : null;
  }
  if (typeof body.lessonId === "string" || body.lessonId === null) {
    const raw = typeof body.lessonId === "string" ? body.lessonId.trim() : "";
    if (!raw) data.lessonId = null;
    else {
      const id = toLessonId(raw);
      if (!id || !getLesson(id)) errors.push(`Lesson "${raw}" doesn't exist`);
      else data.lessonId = id;
    }
  }
  if (typeof body.mcqEligible === "boolean") data.mcqEligible = body.mcqEligible;

  const merged = {
    question: (typeof body.question === "string" ? body.question : existing?.question) ?? "",
    options: (data.options as string[] | undefined) ?? existing?.options ?? [],
    correctIndex: data.correctIndex !== undefined ? (data.correctIndex as number | null) : (existing?.correctIndex ?? null),
    explanation: data.explanation !== undefined ? (data.explanation as string | null) : (existing?.explanation ?? null),
    difficulty: (typeof body.difficulty === "string" ? body.difficulty : existing?.difficulty) ?? "Medium",
    mcqEligible: (data.mcqEligible as boolean | undefined) ?? existing?.mcqEligible ?? false,
  };

  if (merged.mcqEligible) {
    errors.push(...validateMcq({ ...merged, explanation: merged.explanation ?? "" }));
    // Keep the flashcard answer in sync with the correct option.
    if (!errors.length && merged.correctIndex !== null) data.answer = merged.options[merged.correctIndex];
  }
  return { errors, data };
}
