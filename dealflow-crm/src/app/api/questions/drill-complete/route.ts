import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

function utcDayString(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addUtcDays(dayStr: string, delta: number) {
  const [y, m, d] = dayStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

function nextStreak(lastDrillDay: string | null, today: string, current: number): number {
  if (!lastDrillDay) return 1;
  if (lastDrillDay === today) return current;
  const yesterday = addUtcDays(today, -1);
  if (lastDrillDay === yesterday) return current + 1;
  return 1;
}

type Action = "known" | "review" | "skip";

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    results?: { questionId: string; action: Action }[];
  };
  const results = body.results ?? [];
  if (!Array.isArray(results) || results.length === 0) {
    return NextResponse.json({ error: "results required" }, { status: 400 });
  }

  const today = utcDayString(new Date());

  const dup = await prisma.dailyDrillLog.findUnique({
    where: { userId_date: { userId, date: today } },
  });
  if (dup) {
    return NextResponse.json({ error: "Daily drill already completed" }, { status: 409 });
  }

  let xpSession = 0;
  let correct = 0;
  let answered = 0;

  for (const row of results) {
    const action = row.action;
    const qid = String(row.questionId ?? "");
    if (!qid || !["known", "review", "skip"].includes(action)) continue;
    if (action === "known") {
      xpSession += 10;
      correct += 1;
      answered += 1;
      await prisma.userQuestionProgress.upsert({
        where: { userId_questionId: { userId, questionId: qid } },
        create: { userId, questionId: qid, status: "known" },
        update: { status: "known", lastSeen: new Date() },
      });
    } else if (action === "review") {
      xpSession += 2;
      answered += 1;
      await prisma.userQuestionProgress.upsert({
        where: { userId_questionId: { userId, questionId: qid } },
        create: { userId, questionId: qid, status: "review" },
        update: { status: "review", lastSeen: new Date() },
      });
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { drillStreak: true, lastDrillDay: true, xp: true, weeklyXP: true, name: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const streak = nextStreak(user.lastDrillDay, today, user.drillStreak);
  const nextXp = user.xp + xpSession;
  const nextWeekly = user.weeklyXP + xpSession;

  await prisma.$transaction([
    prisma.dailyDrillLog.create({
      data: {
        userId,
        date: today,
        questionsAnswered: answered,
        correct,
        xpEarned: xpSession,
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        drillStreak: streak,
        lastDrillDay: today,
        xp: nextXp,
        weeklyXP: nextWeekly,
      },
    }),
    prisma.leaderboardEntry.upsert({
      where: { userId },
      create: {
        userId,
        username: user.name,
        weeklyXP: nextWeekly,
        totalXP: nextXp,
        streak,
      },
      update: {
        username: user.name,
        weeklyXP: nextWeekly,
        totalXP: nextXp,
        streak,
      },
    }),
  ]);

  const milestone =
    streak === 7 || streak === 30 || streak === 100 ? streak : null;

  return NextResponse.json({
    drillStreak: streak,
    xp: nextXp,
    weeklyXP: nextWeekly,
    xpEarned: xpSession,
    correct,
    answered,
    milestoneStreak: milestone,
  });
}
