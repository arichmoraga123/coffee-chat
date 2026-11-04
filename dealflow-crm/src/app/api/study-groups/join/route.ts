import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { teamIfNone } from "@/lib/group-competition";

const Body = z.object({ code: z.string().trim().max(20).optional(), groupId: z.string().max(64).optional() });

/** Join an open group by id, or any group with its join code. */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.code && !parsed.data.groupId)) return NextResponse.json({ error: "Enter a join code." }, { status: 400 });
  const { code, groupId } = parsed.data;
  const group = code
    ? await prisma.studyGroup.findUnique({ where: { joinCode: code.toUpperCase() }, select: { id: true, name: true } })
    : await prisma.studyGroup.findFirst({ where: { id: groupId, visibility: "open" }, select: { id: true, name: true } });
  if (!group) return NextResponse.json({ error: code ? "No group with that code." : "That group is invite-only." }, { status: 404 });
  await prisma.studyGroupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId } },
    create: { groupId: group.id, userId, role: "member" },
    update: {},
  });
  await teamIfNone(userId, group.id);
  return NextResponse.json({ ok: true, groupId: group.id, name: group.name });
}
