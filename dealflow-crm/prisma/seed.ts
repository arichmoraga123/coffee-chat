import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { SEED_QUESTIONS } from "./seed/questions";
import { SEED_QUESTIONS_EXTENDED } from "./seed/questions-extended";
import { SEED_TIMELINES } from "./seed/timelines";

const prisma = new PrismaClient();

function dedupeKeyFor(question: string) {
  return createHash("sha256").update(question.trim()).digest("hex");
}

async function main() {
  const allSeed = [...SEED_QUESTIONS, ...SEED_QUESTIONS_EXTENDED];
  const questionRows = allSeed.map((q) => ({
    question: q.question,
    answer: q.answer,
    category: q.category,
    subcategory: q.subcategory ?? null,
    difficulty: q.difficulty,
    tags: q.tags,
    source: q.source ?? "BIWS 400 Questions Guide",
    status: "active",
    dedupeKey: dedupeKeyFor(q.question),
  }));

  const { count } = await prisma.question.createMany({
    data: questionRows,
    skipDuplicates: true,
  });
  console.log(`Questions upserted via createMany (new rows this run ~${count}).`);

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
