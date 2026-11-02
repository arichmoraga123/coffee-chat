import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { utcDay, DAILY_SET_SIZE } from "@/lib/mcq/server";
import { unreadCount } from "@/lib/dm";
import { tasksDueCount } from "@/lib/tasks-data";

/** Small counts for the sidebar: daily-set questions left, open mentor questions, and club membership. */
export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const today = utcDay();
  const [user, log, set, membership] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, role: true, sidebarCollapsed: true } }),
    prisma.dailyDrillLog.findUnique({ where: { userId_date: { userId, date: today } }, select: { id: true } }),
    prisma.dailyQuestionSet.findUnique({ where: { userId_date: { userId, date: today } }, select: { questionIds: true } }),
    prisma.clubMember.findFirst({ where: { userId, active: true, club: { name: "PE@Broad" } }, select: { role: true } }),
  ]);
  let dailyLeft = DAILY_SET_SIZE;
  if (log) dailyLeft = 0;
  else if (set) {
    const done = await prisma.questionAttempt.count({
      where: { userId, context: "drill", questionId: { in: set.questionIds }, createdAt: { gte: new Date(`${today}T00:00:00Z`) } },
    });
    dailyLeft = Math.max(0, set.questionIds.length - done);
  }
  const [unread, pendingChallenges] = membership
    ? await Promise.all([
        unreadCount(userId),
        prisma.challenge.count({
          where: { status: { in: ["pending", "accepted", "live"] }, mode: { in: ["async", "live"] }, participants: { some: { userId, finishedAt: null } }, NOT: { status: "pending", createdById: userId } },
        }),
      ])
    : [0, 0];
  const isMentor = user?.role === "ADMIN" || user?.role === "MENTOR";
  const [tasksDue, notificationsUnread] = await Promise.all([tasksDueCount(userId), prisma.notification.count({ where: { userId, readAt: null } })]);
  const mentorOpen = isMentor ? await prisma.mentorQuestion.count({ where: { status: "open" } }) : 0;
  return NextResponse.json({
    name: user?.name ?? "",
    role: user?.role ?? "USER",
    clubMember: Boolean(membership),
    clubRole: membership?.role ?? null,
    dailyLeft,
    mentorOpen,
    unread,
    pendingChallenges,
    tasksDue,
    notificationsUnread,
    sidebarCollapsed: user?.sidebarCollapsed ?? null,
  });
}
