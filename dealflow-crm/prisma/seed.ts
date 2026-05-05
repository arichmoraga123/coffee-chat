import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { SEED_QUESTIONS } from "./seed/questions";
import { SEED_QUESTIONS_EXTENDED } from "./seed/questions-extended";
import { SEED_TIMELINES } from "./seed/timelines";
import { mockInterviewSeedRows } from "./seed/mock-interview-questions";
import { SEED_FIRM_RESEARCH } from "./seed/firm-research";
import { SEED_EMAIL_TEMPLATES } from "./seed/email-templates-seed";
import { SEED_DEALS } from "./seed/deals-seed";
import { SEED_RECRUITING_CALENDAR } from "./seed/recruiting-calendar-seed";

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

  const mockRows = mockInterviewSeedRows();
  const { count: mockCount } = await prisma.mockInterviewQuestion.createMany({
    data: mockRows.map((r) => ({
      question: r.question,
      category: r.category,
      bankSource: r.bankSource,
      year: r.year,
      difficulty: r.difficulty,
      modelAnswer: r.modelAnswer,
      tips: r.tips,
      dedupeKey: r.dedupeKey,
      status: r.status,
      upvotes: r.upvotes,
    })),
    skipDuplicates: true,
  });
  console.log(`Mock interview questions seed (new rows ~${mockCount}).`);

  const { count: frCount } = await prisma.firmResearch.createMany({
    data: SEED_FIRM_RESEARCH.map((f) => ({
      firmName: f.firmName,
      firmType: f.firmType,
      aum: f.aum,
      founded: f.founded,
      headquarters: f.headquarters,
      description: f.description,
      investmentFocus: f.investmentFocus,
      dealSize: f.dealSize,
      notableDeals: f.notableDeals,
      whatTheyLookFor: f.whatTheyLookFor,
      hiringTimeline: f.hiringTimeline,
      interviewProcess: f.interviewProcess,
      culture: f.culture,
      msuAlumni: f.msuAlumni,
      websiteUrl: f.websiteUrl,
      linkedinUrl: f.linkedinUrl,
    })),
    skipDuplicates: true,
  });
  console.log(`Firm research seed (new rows ~${frCount}).`);

  const { count: etCount } = await prisma.emailTemplate.createMany({
    data: SEED_EMAIL_TEMPLATES.map((t) => ({
      title: t.title,
      category: t.category,
      subject: t.subject,
      body: t.body,
      tags: t.tags,
      isOfficial: t.isOfficial,
      dedupeKey: t.dedupeKey,
      upvotes: 0,
    })),
    skipDuplicates: true,
  });
  console.log(`Email templates seed (new rows ~${etCount}).`);

  await prisma.dealBookmark.deleteMany({});
  await prisma.deal.deleteMany({});

  const { count: dealCount } = await prisma.deal.createMany({
    data: SEED_DEALS.map((d) => ({
      title: d.title,
      acquirer: d.acquirer,
      target: d.target,
      dealValue: d.dealValue,
      dealType: d.dealType,
      vertical: d.vertical ?? null,
      sector: d.sector,
      summary: d.summary,
      keyThesis: d.keyThesis,
      risks: d.risks,
      sourceUrl: d.sourceUrl,
      announcedAt: d.announcedAt,
      status: d.status,
      dedupeKey: d.dedupeKey,
    })),
    skipDuplicates: true,
  });
  console.log(`Deals seed (cleared + inserted ~${dealCount} rows, skipDuplicates on unique keys).`);

  const { count: rcCount } = await prisma.recruitingCalendarEvent.createMany({
    data: SEED_RECRUITING_CALENDAR.map((r) => ({
      ...r,
      upvotes: 0,
      isRecurring: false,
    })),
    skipDuplicates: true,
  });
  console.log(`Recruiting calendar seed (new rows ~${rcCount}).`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
