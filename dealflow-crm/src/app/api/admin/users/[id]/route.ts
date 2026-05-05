import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUserId } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdminUserId();
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          contacts: true,
          firms: true,
          opportunities: true,
          interactions: true,
          tasks: true,
          questionProgress: true,
          mockInterviewSessions: true,
          dealBookmarks: true,
          interviewDebriefs: true,
        },
      },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [knownQs, drillLogs, recentSessions, apiCalls] = await Promise.all([
    prisma.userQuestionProgress.count({ where: { userId: id, status: "known" } }),
    prisma.dailyDrillLog.findMany({
      where: { userId: id },
      orderBy: { date: "desc" },
      take: 14,
    }),
    prisma.mockInterviewSession.findMany({
      where: { userId: id },
      orderBy: { completedAt: "desc" },
      take: 10,
      select: { id: true, mode: true, completedAt: true, duration: true },
    }),
    prisma.apiUsageLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, feature: true, inputTokens: true, outputTokens: true, createdAt: true },
    }),
  ]);

  const { passwordHash: _, ...safe } = user;
  return NextResponse.json({
    user: safe,
    breakdown: {
      questionsMastered: knownQs,
      drillLogs,
      mockInterviewSessions: recentSessions,
      apiUsageRecent: apiCalls,
    },
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdminUserId();
  const { id } = await params;
  const body = (await req.json()) as { role?: string; accountActive?: boolean };
  const data: { role?: string; accountActive?: boolean } = {};
  if (body.role === "USER" || body.role === "ADMIN") data.role = body.role;
  if (typeof body.accountActive === "boolean") data.accountActive = body.accountActive;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }
  const user = await prisma.user.update({ where: { id }, data });
  return NextResponse.json({ id: user.id, role: user.role, accountActive: user.accountActive });
}
