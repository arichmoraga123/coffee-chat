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

  // XP only for the FIRST time a question is mastered — re-answering can't farm the leaderboard.
  const prior = await prisma.userQuestionProgress.findUnique({
    where: { userId_questionId: { userId, questionId } },
    select: { status: true },
  });
  const awardMcqXp = status === "known" && source === "mcq_quiz" && prior?.status !== "known";

  if (awardMcqXp) {
    const xp = 10;
    const [, updatedUser] = await prisma.$transaction([
      prisma.userQuestionProgress.upsert({
        where: { userId_questionId: { userId, questionId } },
        create: { userId, questionId, status: "known" },
        update: { status: "known", lastSeen: new Date() },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: xp }, weeklyXP: { increment: xp } },
        select: { name: true, xp: true, weeklyXP: true, drillStreak: true },
      }),
    ]);
    const nextXp = updatedUser.xp;
    const nextWeekly = updatedUser.weeklyXP;
    await prisma.leaderboardEntry.upsert({
      where: { userId },
      create: {
        userId,
        username: updatedUser.name,
        weeklyXP: nextWeekly,
        totalXP: nextXp,
        streak: updatedUser.drillStreak,
      },
      update: { username: updatedUser.name, weeklyXP: nextWeekly, totalXP: nextXp },
    });

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
