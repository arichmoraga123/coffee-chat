import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const progress = await prisma.userQuestionProgress.findMany({
    where: { userId },
    select: { questionId: true, status: true, lastSeen: true },
  });
  return NextResponse.json({ progress });
}

export async function PATCH(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const questionId = String(body.questionId ?? "");
  const status = String(body.status ?? "");
  const source = String(body.source ?? "");

  if (!questionId || !["known", "review", "unseen"].includes(status)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const question = await prisma.question.findFirst({
    where: { id: questionId, status: "active" },
    select: { id: true },
  });
  if (!question) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const awardMcqXp = status === "known" && source === "mcq_quiz";

  if (awardMcqXp) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, xp: true, weeklyXP: true, drillStreak: true },
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const xp = 10;
    const nextXp = user.xp + xp;
    const nextWeekly = user.weeklyXP + xp;

    await prisma.$transaction([
      prisma.userQuestionProgress.upsert({
        where: { userId_questionId: { userId, questionId } },
        create: { userId, questionId, status: "known" },
        update: { status: "known", lastSeen: new Date() },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { xp: nextXp, weeklyXP: nextWeekly },
      }),
      prisma.leaderboardEntry.upsert({
        where: { userId },
        create: {
          userId,
          username: user.name,
          weeklyXP: nextWeekly,
          totalXP: nextXp,
          streak: user.drillStreak,
        },
        update: {
          username: user.name,
          weeklyXP: nextWeekly,
          totalXP: nextXp,
        },
      }),
    ]);

    const row = await prisma.userQuestionProgress.findUnique({
      where: { userId_questionId: { userId, questionId } },
    });
    return NextResponse.json({ ...row, xpAwarded: xp, xp: nextXp, weeklyXP: nextWeekly });
  }

  const row = await prisma.userQuestionProgress.upsert({
    where: { userId_questionId: { userId, questionId } },
    create: { userId, questionId, status },
    update: { status, lastSeen: new Date() },
  });
  return NextResponse.json(row);
}
