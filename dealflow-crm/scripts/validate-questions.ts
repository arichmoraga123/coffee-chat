/**
 * Checks the hand-written MCQ bank: unique ids, exactly 4 non-blank, non-duplicate options, one correct
 * answer that matches `answer`, an explanation, a valid difficulty, and a lesson that exists in /learn.
 * Usage: npm run validate-questions
 */
import { PEB_BANK_V1 } from "../src/lib/mcq/bank";
import { capitalizeDifficulty, toLessonId, validateMcq } from "../src/lib/mcq/validate";
import { getLesson } from "../src/lib/learn/lessons";

const problems: string[] = [];
const ids = new Set<string>();
const texts = new Map<string, string>();

for (const q of PEB_BANK_V1) {
  const where = q.id || "(missing id)";
  if (!q.id) problems.push(`${where}: missing id`);
  else if (ids.has(q.id)) problems.push(`${where}: duplicate id`);
  ids.add(q.id);

  for (const e of validateMcq({
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation ?? "",
    difficulty: capitalizeDifficulty(q.difficulty ?? ""),
  }))
    problems.push(`${where}: ${e}`);

  if (q.options?.[q.correctIndex] !== undefined && q.answer?.trim() !== q.options[q.correctIndex].trim()) {
    problems.push(`${where}: "answer" doesn't match the option marked correct`);
  }
  const lesson = toLessonId(q.lessonId);
  if (!lesson || !getLesson(lesson)) problems.push(`${where}: lesson ${q.lessonId} doesn't exist in /learn`);

  const key = q.question?.trim().toLowerCase();
  if (key && texts.has(key)) problems.push(`${where}: same question text as ${texts.get(key)}`);
  if (key) texts.set(key, q.id);
}

if (problems.length) {
  console.error(`✗ ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ ${PEB_BANK_V1.length} questions valid`);
