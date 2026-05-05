import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const member = await prisma.studyGroupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const group = await prisma.studyGroup.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, drillStreak: true, weeklyXP: true, xp: true } } },
      },
      messages: { orderBy: { createdAt: "asc" }, take: 200, include: { user: { select: { name: true } } } },
    },
  });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ group });
}
