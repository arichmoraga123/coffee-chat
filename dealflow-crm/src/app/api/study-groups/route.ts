import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

/** Groups are SHARED among members only (enforced in GET detail). */
export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const memberships = await prisma.studyGroupMember.findMany({
    where: { userId },
    include: { group: { include: { _count: { select: { members: true } } } } },
  });
  return NextResponse.json({
    groups: memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      role: m.role,
      memberCount: m.group._count.members,
    })),
  });
}

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const group = await prisma.studyGroup.create({
    data: {
      name,
      createdBy: userId,
      members: { create: { userId, role: "admin" } },
    },
    include: { members: { include: { user: { select: { id: true, name: true, email: true, drillStreak: true, weeklyXP: true, xp: true } } } } },
  });
  return NextResponse.json(group);
}
