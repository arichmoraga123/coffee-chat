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
import { SEED_TRACK_QUESTIONS } from "./seed/track-questions";
import { SEED_CONSULTING_CASES } from "./seed/consulting-cases";
import { PROSPECT_SCHOOL_SEED } from "./seed/prospect-schools";
import { randomReferralCode } from "../src/lib/referral-code";

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
    keywords: q.keywords,
    source: q.source ?? "BIWS 400 Questions Guide",
    status: "active",
    dedupeKey: dedupeKeyFor(q.question),
    careerTracks: [] as string[],
  }));

  for (const row of questionRows) {
    await prisma.question.upsert({
      where: { dedupeKey: row.dedupeKey },
      create: row,
      update: {
        answer: row.answer,
        category: row.category,
        subcategory: row.subcategory,
        difficulty: row.difficulty,
        tags: row.tags,
        keywords: row.keywords,
        source: row.source,
        status: row.status,
        careerTracks: row.careerTracks,
      },
    });
  }
  console.log(`Questions upserted with keywords (${questionRows.length} total).`);

  for (const q of SEED_TRACK_QUESTIONS) {
    const dedupeKey = dedupeKeyFor(q.question);
    await prisma.question.upsert({
      where: { dedupeKey },
      create: {
        question: q.question,
        answer: q.answer,
        category: q.category,
        subcategory: null,
        difficulty: q.difficulty,
        tags: q.tags,
        keywords: q.keywords,
        source: q.source,
        status: "active",
        dedupeKey,
        careerTracks: q.careerTracks,
      },
      update: {
        answer: q.answer,
        category: q.category,
        difficulty: q.difficulty,
        tags: q.tags,
        keywords: q.keywords,
        source: q.source,
        careerTracks: q.careerTracks,
      },
    });
  }
  console.log(`Track-specific questions upserted (${SEED_TRACK_QUESTIONS.length}).`);

  for (const t of SEED_TIMELINES) {
    const existing = await prisma.firmTimeline.findFirst({
      where: { firmName: t.firmName, role: t.role, year: t.year },
    });
    const data = {
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
      careerTracks: t.careerTracks,
    };
    if (existing) {
      await prisma.firmTimeline.update({ where: { id: existing.id }, data });
    } else {
      await prisma.firmTimeline.create({ data });
    }
  }
  console.log(`Firm timelines synced (${SEED_TIMELINES.length}).`);

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
      careerTracks: r.careerTracks,
    })),
    skipDuplicates: true,
  });
  console.log(`Mock interview questions seed (new rows ~${mockCount}).`);

  const { count: ccCount } = await prisma.consultingCase.createMany({
    data: SEED_CONSULTING_CASES.map((c) => ({
      title: c.title,
      type: c.type,
      difficulty: c.difficulty,
      prompt: c.prompt,
      framework: c.framework,
      sampleAnswer: c.sampleAnswer,
      firmSource: c.firmSource,
      isShared: c.isShared,
      dedupeKey: c.dedupeKey,
      careerTracks: c.careerTracks,
    })),
    skipDuplicates: true,
  });
  console.log(`Consulting cases seed (new rows ~${ccCount}).`);

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
      careerTracks: d.careerTracks ?? [],
    })),
    skipDuplicates: true,
  });
  console.log(`Deals seed (inserted new rows ~${dealCount}, existing deals preserved).`);

  const { count: rcCount } = await prisma.recruitingCalendarEvent.createMany({
    data: SEED_RECRUITING_CALENDAR.map((r) => ({
      ...r,
      upvotes: 0,
      isRecurring: false,
    })),
    skipDuplicates: true,
  });
  console.log(`Recruiting calendar seed (new rows ~${rcCount}).`);

  const { count: schoolCount } = await prisma.school.createMany({
    data: PROSPECT_SCHOOL_SEED.map((s) => ({
      name: s.name,
      shortName: s.shortName,
      domain: s.domain,
      location: s.location,
      country: s.country ?? "US",
      type: s.type,
      isVerified: s.isVerified,
    })),
    skipDuplicates: true,
  });
  console.log(`Prospect schools seed (new rows ~${schoolCount}).`);

  const msu = await prisma.school.findUnique({ where: { domain: "msu.edu" } });
  if (msu) {
    await prisma.club.upsert({
      where: { schoolId_name: { schoolId: msu.id, name: "PE@Broad" } },
      create: {
        schoolId: msu.id,
        name: "PE@Broad",
        type: "PE",
        description:
          "Michigan State's premier alternative investments club focused on private equity, venture capital, and alternative assets",
        isVerified: true,
        isPublic: true,
      },
      update: {
        type: "PE",
        description:
          "Michigan State's premier alternative investments club focused on private equity, venture capital, and alternative assets",
        isVerified: true,
        isPublic: true,
      },
    });
    const linked = await prisma.user.updateMany({
      where: { email: { endsWith: "@msu.edu" } },
      data: { schoolId: msu.id },
    });
    console.log(`PE@Broad club ensured; MSU schoolId set for ${linked.count} users.`);
  }

  await prisma.question.updateMany({ data: { scope: "global" } });
  await prisma.firmTimeline.updateMany({ data: { scope: "global" } });
  console.log("Questions and firm timelines scoped to global.");

  const needCode = await prisma.user.findMany({
    where: { OR: [{ referralCode: null }, { referralCode: "" }] },
    select: { id: true },
  });
  for (const u of needCode) {
    let code = randomReferralCode();
    for (let attempt = 0; attempt < 40; attempt++) {
      const clash = await prisma.user.findFirst({ where: { referralCode: code } });
      if (!clash) break;
      code = randomReferralCode();
    }
    await prisma.user.update({ where: { id: u.id }, data: { referralCode: code } });
  }
  if (needCode.length) console.log(`Referral codes backfilled for ${needCode.length} users.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
