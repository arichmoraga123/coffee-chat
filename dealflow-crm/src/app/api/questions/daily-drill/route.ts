import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { getOrCreateDailySet, publicMcqsByIds, utcDay } from "@/lib/mcq/server";

/** Today's 5-question set: due spaced-repetition reviews first, then the student's weakest lessons. */
export async function POST() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = utcDay();
  const [existing, user] = await Promise.all([
    prisma.dailyDrillLog.findUnique({ where: { userId_date: { userId, date: today } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { drillStreak: true, xp: true, weeklyXP: true } }),
  ]);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing) {
    return NextResponse.json({ completed: true, drillStreak: user.drillStreak, xp: user.xp, weeklyXP: user.weeklyXP, log: existing });
  }

  const ids = await getOrCreateDailySet(userId);
  const questions = await publicMcqsByIds(ids);
  // Questions already answered today (e.g. the student refreshed mid-drill) are skipped.
  const answered = await prisma.questionAttempt.findMany({
    where: { userId, context: "drill", questionId: { in: ids }, createdAt: { gte: new Date(`${today}T00:00:00Z`) } },
    select: { questionId: true },
  });
  const done = new Set(answered.map((a) => a.questionId));

  return NextResponse.json({
    completed: false,
    questions: questions.filter((q) => !done.has(q.id)),
    total: questions.length,
    drillStreak: user.drillStreak,
    xp: user.xp,
    weeklyXP: user.weeklyXP,
  });
}
