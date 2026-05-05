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
  const messages = await prisma.studyGroupMessage.findMany({
    where: { groupId: id },
    orderBy: { createdAt: "asc" },
    take: 300,
    include: { user: { select: { name: true } } },
  });
  return NextResponse.json({ messages });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const member = await prisma.studyGroupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json()) as { body?: string };
  const text = String(body.body ?? "").trim();
  if (!text) return NextResponse.json({ error: "body required" }, { status: 400 });
  const msg = await prisma.studyGroupMessage.create({
    data: { groupId: id, userId, body: text },
    include: { user: { select: { name: true } } },
  });
  return NextResponse.json(msg);
}
