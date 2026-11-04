import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { newJoinCode, teamIfNone } from "@/lib/group-competition";

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
  const name = String(body.name ?? "").trim().slice(0, 60);
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const description = String(body.description ?? "").trim().slice(0, 200) || null;
  const visibility = body.visibility === "open" ? "open" : "invite";
  const group = await prisma.studyGroup.create({
    data: {
      name,
      description,
      visibility,
      joinCode: newJoinCode(),
      createdBy: userId,
      members: { create: { userId, role: "admin" } },
    },
    include: { members: { include: { user: { select: { id: true, name: true, email: true, drillStreak: true, weeklyXP: true, xp: true } } } } },
  });
  // Your first group becomes your team.
  await teamIfNone(userId, group.id);
  return NextResponse.json(group);
}
