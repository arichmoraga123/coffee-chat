import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUserId } from "@/lib/auth";

function utcDayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  await requireAdminUserId();
  const now = new Date();
  const d30 = new Date(now);
  d30.setUTCDate(d30.getUTCDate() - 30);
  const weekStart = new Date(now);
  weekStart.setUTCDate(weekStart.getUTCDate() - 7);
  const weekKey = utcDayKey(weekStart);

  const [answeredAll, answeredWeekRows] = await Promise.all([
    prisma.dailyDrillLog.aggregate({ _sum: { questionsAnswered: true } }),
    prisma.dailyDrillLog.findMany({
      where: { date: { gte: weekKey } },
      select: { questionsAnswered: true },
    }),
  ]);
  const answeredWeek = answeredWeekRows.reduce((s, r) => s + r.questionsAnswered, 0);

  const progressSample = await prisma.userQuestionProgress.findMany({
    where: { status: { in: ["known", "review"] } },
    select: { question: { select: { category: true } } },
    take: 15000,
  });
  const categoryDrill: Record<string, number> = {};
  for (const p of progressSample) {
    const c = p.question.category;
    categoryDrill[c] = (categoryDrill[c] ?? 0) + 1;
  }
  const categoryBars = Object.entries(categoryDrill)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);

  const drillDays = await prisma.dailyDrillLog.findMany({
    where: { date: { gte: utcDayKey(d30) } },
    select: { date: true, userId: true },
  });
  const dauMap: Record<string, Set<string>> = {};
  for (const row of drillDays) {
    if (!dauMap[row.date]) dauMap[row.date] = new Set();
    dauMap[row.date].add(row.userId);
  }
  const activeDays = await prisma.user.findMany({
    where: { lastActiveAt: { gte: d30 } },
    select: { id: true, lastActiveAt: true },
  });
  for (const u of activeDays) {
    const k = utcDayKey(u.lastActiveAt!);
    if (!dauMap[k]) dauMap[k] = new Set();
    dauMap[k].add(u.id);
  }
  const dauLine = Object.keys(dauMap)
    .sort()
    .map((date) => ({ date, users: dauMap[date]!.size }));

  const signups = await prisma.user.findMany({
    where: { createdAt: { gte: d30 } },
    select: { createdAt: true },
  });
  const signupMap: Record<string, number> = {};
  for (const u of signups) {
    const k = utcDayKey(u.createdAt);
    signupMap[k] = (signupMap[k] ?? 0) + 1;
  }
  const signupLine = Object.keys(signupMap)
    .sort()
    .map((date) => ({ date, count: signupMap[date]! }));

  const [drillTouches, contactTouches, pipeTouches, dealTouches] = await Promise.all([
    prisma.dailyDrillLog.count(),
    prisma.contact.count(),
    prisma.opportunity.count(),
    prisma.dealBookmark.count(),
  ]);
  const featureUsage = [
    { name: "Drill (logs)", value: drillTouches },
    { name: "Contacts", value: contactTouches },
    { name: "Pipeline opps", value: pipeTouches },
    { name: "Deal bookmarks", value: dealTouches },
  ];

  const topXp = await prisma.user.findMany({
    where: { accountActive: true },
    orderBy: { xp: "desc" },
    take: 10,
    select: { id: true, name: true, email: true, xp: true, weeklyXP: true },
  });

  const [pendingQuestions, pendingMock, pendingVault] = await Promise.all([
    prisma.question.count({ where: { status: "pending" } }),
    prisma.mockInterviewQuestion.count({ where: { status: "pending" } }),
    prisma.vaultDocument.count({ where: { status: "pending" } }),
  ]);

  return NextResponse.json({
    questionsAnsweredAllTime: answeredAll._sum.questionsAnswered ?? 0,
    questionsAnsweredThisWeek: answeredWeek,
    categoryBars,
    dauLine,
    signupLine,
    featureUsage,
    topXp,
    pending: { questions: pendingQuestions, mockInterview: pendingMock, vault: pendingVault },
  });
}
