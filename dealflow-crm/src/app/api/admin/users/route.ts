import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUserId } from "@/lib/auth";

export async function GET(req: Request) {
  await requireAdminUserId();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const where =
    q.length > 0
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      lastActiveAt: true,
      updatedAt: true,
      drillStreak: true,
      xp: true,
      accountActive: true,
      _count: {
        select: {
          contacts: true,
          opportunities: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const knownGrouped = await prisma.userQuestionProgress.groupBy({
    by: ["userId"],
    where: { status: "known" },
    _count: { _all: true },
  });
  const knownMap = Object.fromEntries(knownGrouped.map((g) => [g.userId, g._count._all]));

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const monthAgo = new Date(now);
  monthAgo.setUTCMonth(monthAgo.getUTCMonth() - 1);

  const [totalUsers, activeWeek, activeMonth] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        accountActive: true,
        OR: [{ lastActiveAt: { gte: weekAgo } }, { updatedAt: { gte: weekAgo } }],
      },
    }),
    prisma.user.count({
      where: {
        accountActive: true,
        OR: [{ lastActiveAt: { gte: monthAgo } }, { updatedAt: { gte: monthAgo } }],
      },
    }),
  ]);

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      questionsMastered: knownMap[u.id] ?? 0,
      contactsAdded: u._count.contacts,
      pipelineOpportunities: u._count.opportunities,
    })),
    totals: { totalUsers, activeWeek, activeMonth },
  });
}
