import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { newJoinCode } from "@/lib/group-competition";

const Body = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  description: z.string().trim().max(200).optional(),
  visibility: z.enum(["open", "invite"]).optional(),
  newCode: z.boolean().optional(),
  /** Make another member a captain. */
  promote: z.string().max(64).optional(),
});

/** Captain settings: name, description, open or invite-only, a new join code, more captains. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const captain = await prisma.studyGroupMember.findFirst({ where: { groupId: id, userId, role: "admin" } });
  if (!captain) return NextResponse.json({ error: "Only captains can change settings." }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  const b = parsed.data;
  if (b.promote) await prisma.studyGroupMember.updateMany({ where: { groupId: id, userId: b.promote }, data: { role: "admin" } });
  const g = await prisma.studyGroup.update({
    where: { id },
    data: {
      ...(b.name ? { name: b.name } : {}),
      ...(b.description !== undefined ? { description: b.description || null } : {}),
      ...(b.visibility ? { visibility: b.visibility } : {}),
      ...(b.newCode ? { joinCode: newJoinCode() } : {}),
    },
    select: { name: true, description: true, visibility: true, joinCode: true },
  });
  return NextResponse.json({ group: g });
}
