import type { PrismaClient } from "@prisma/client";
import { PEB_BANK } from "../../src/lib/mcq/bank";
import { capitalizeDifficulty, toLessonId } from "../../src/lib/mcq/validate";

/**
 * Upserts the hand-written PE@Broad MCQ bank by id. Re-running never duplicates or deletes anything.
 * Run with `npm run db:seed` (whole seed) or `npm run seed:questions` (just this bank).
 */
export async function seedPebQuestions(prisma: PrismaClient) {
  let n = 0;
  for (const q of PEB_BANK) {
    const lessonId = toLessonId(q.lessonId);
    const data = {
      question: q.question.trim(),
      answer: q.answer.trim(),
      category: q.category,
      difficulty: capitalizeDifficulty(q.difficulty),
      tags: [q.category, `lesson ${q.lessonId}`],
      keywords: q.keywords ?? [],
      source: q.source ?? "PE@Broad Technical Bank v2",
      status: "active",
      scope: "global",
      careerTracks: [] as string[],
      options: q.options.map((o) => o.trim()),
      correctIndex: q.correctIndex,
      explanation: q.explanation.trim(),
      lessonId,
      mcqEligible: q.mcqEligible !== false,
    };
    await prisma.question.upsert({
      where: { id: q.id },
      create: { id: q.id, dedupeKey: `peb:${q.id}`, ...data },
      update: data,
    });
    n++;
  }
  console.log(`PE@Broad MCQ bank upserted (${n} questions).`);
}
