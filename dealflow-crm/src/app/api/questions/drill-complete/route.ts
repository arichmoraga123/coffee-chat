import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { utcDay } from "@/lib/mcq/server";

function addUtcDays(dayStr: string, delta: number) {
  const [y, m, d] = dayStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

function nextStreak(lastDrillDay: string | null, today: string, current: number): number {
  if (!lastDrillDay) return 1;
  if (lastDrillDay === today) return current;
  return lastDrillDay === addUtcDays(today, -1) ? current + 1 : 1;
}

/**
 * Closes out today's daily set. The score comes from the server-graded attempts logged for today's set —
 * nothing the browser reports is trusted. +10 XP per correct answer, +2 per attempted miss.
 */
export async function POST() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = utcDay();
  const [dup, set] = await Promise.all([
    prisma.dailyDrillLog.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.dailyQuestionSet.findUnique({ where: { userId_date: { userId, date: today } } }),
  ]);
  if (dup) return NextResponse.json({ error: "Daily drill already completed" }, { status: 409 });
  if (!set) return NextResponse.json({ error: "No daily set for today" }, { status: 400 });

  const attempts = await prisma.questionAttempt.findMany({
    where: { userId, context: "drill", questionId: { in: set.questionIds }, createdAt: { gte: new Date(`${today}T00:00:00Z`) } },
    orderBy: { createdAt: "asc" },
    select: { questionId: true, correct: true },
  });
  // First attempt per question counts.
  const first = new Map<string, boolean>();
  for (const a of attempts) if (!first.has(a.questionId)) first.set(a.questionId, a.correct);
  const answered = first.size;
  if (answered === 0) return NextResponse.json({ error: "Answer at least one question first" }, { status: 400 });
  const correct = [...first.values()].filter(Boolean).length;
  const xpSession = correct * 10 + (answered - correct) * 2;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { drillStreak: true, lastDrillDay: true, xp: true, weeklyXP: true, name: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const streak = nextStreak(user.lastDrillDay, today, user.drillStreak);
  const nextXp = user.xp + xpSession;
  const nextWeekly = user.weeklyXP + xpSession;

  try {
    await prisma.$transaction([
      prisma.dailyDrillLog.create({ data: { userId, date: today, questionsAnswered: answered, correct, xpEarned: xpSession } }),
      prisma.user.update({
        where: { id: userId },
        data: { drillStreak: streak, lastDrillDay: today, xp: { increment: xpSession }, weeklyXP: { increment: xpSession } },
      }),
      prisma.leaderboardEntry.upsert({
        where: { userId },
        create: { userId, username: user.name, weeklyXP: nextWeekly, totalXP: nextXp, streak },
        update: { username: user.name, weeklyXP: nextWeekly, totalXP: nextXp, streak },
      }),
    ]);
  } catch {
    // Unique (userId, date) — a double-submit lost the race.
    return NextResponse.json({ error: "Daily drill already completed" }, { status: 409 });
  }

  const milestone = streak === 7 || streak === 30 || streak === 100 ? streak : null;
  return NextResponse.json({
    drillStreak: streak,
    xp: nextXp,
    weeklyXP: nextWeekly,
    xpEarned: xpSession,
    correct,
    answered,
    total: set.questionIds.length,
    milestoneStreak: milestone,
  });
}
