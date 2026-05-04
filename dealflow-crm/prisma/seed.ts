import { PrismaClient } from "@prisma/client";
import { SEED_QUESTIONS } from "./seed/questions";
import { SEED_TIMELINES } from "./seed/timelines";

const prisma = new PrismaClient();

async function main() {
  const questionCount = await prisma.question.count();
  if (questionCount === 0) {
    await prisma.question.createMany({
      data: SEED_QUESTIONS.map((q) => ({
        question: q.question,
        answer: q.answer,
        category: q.category,
        subcategory: q.subcategory ?? null,
        difficulty: q.difficulty,
        tags: q.tags,
        source: q.source ?? "BIWS 400 Questions Guide",
      })),
    });
    console.log(`Seeded ${SEED_QUESTIONS.length} questions.`);
  } else {
    console.log(`Skipping questions seed (${questionCount} already exist).`);
  }

  const timelineCount = await prisma.firmTimeline.count();
  if (timelineCount === 0) {
    await prisma.firmTimeline.createMany({
      data: SEED_TIMELINES.map((t) => ({
        firmName: t.firmName,
        firmType: t.firmType,
        role: t.role,
        applicationOpen: t.applicationOpen,
        applicationClose: t.applicationClose,
        firstRound: t.firstRound,
        finalRound: t.finalRound,
        offerDate: t.offerDate,
        year: t.year,
        notes: t.notes,
        verified: false,
        upvotes: t.upvotes,
      })),
    });
    console.log(`Seeded ${SEED_TIMELINES.length} firm timelines.`);
  } else {
    console.log(`Skipping timelines seed (${timelineCount} already exist).`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
