import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const pitch = await prisma.stockPitch.findFirst({ where: { id, userId } });
  if (!pitch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json()) as { groupId?: string };
  const groupId = String(body.groupId ?? "").trim();
  if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 });
  const member = await prisma.studyGroupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!member) return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
  const row = await prisma.stockPitch.update({
    where: { id },
    data: { sharedToGroupId: groupId },
  });
  return NextResponse.json({ pitch: row });
}
