import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

/** PRIVATE per user. */
export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [attemptedToday, recentSessions, user] = await Promise.all([
    prisma.mockInterviewSession.count({
      where: { userId, completedAt: { gte: startOfDay } },
    }),
    prisma.mockInterviewSession.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
      take: 6,
      select: { id: true, questions: true, completedAt: true, mode: true, bankFilter: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { drillStreak: true },
    }),
  ]);

  const recentQuestionIds = Array.from(
    new Set(
      recentSessions
        .flatMap((s) => s.questions)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
        .slice(0, 12),
    ),
  );

  const recentQuestions = recentQuestionIds.length
    ? await prisma.mockInterviewQuestion.findMany({
        where: { id: { in: recentQuestionIds } },
        select: {
          id: true,
          question: true,
          category: true,
          bankSource: true,
          difficulty: true,
          year: true,
        },
      })
    : [];

  return NextResponse.json({
    attemptedToday,
    streak: user?.drillStreak ?? 0,
    recentQuestions,
  });
}

/** PRIVATE per user. */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  const mode = String(body.mode ?? "");
  const bankFilter = body.bankFilter ? String(body.bankFilter) : null;
  const questions = Array.isArray(body.questions) ? (body.questions as string[]) : [];
  const scores = body.scores ?? {};
  const duration = Number(body.duration ?? 0);
  const aiSummary = body.aiSummary ? String(body.aiSummary) : null;
  if (!["practice", "timed", "bank-specific"].includes(mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }
  const session = await prisma.mockInterviewSession.create({
    data: {
      userId,
      mode,
      bankFilter,
      questions,
      scores: scores as object,
      duration: Number.isFinite(duration) ? duration : 0,
      aiSummary,
    },
  });
  return NextResponse.json(session);
}
