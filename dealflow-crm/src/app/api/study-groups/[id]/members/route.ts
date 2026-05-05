import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const admin = await prisma.studyGroupMember.findFirst({
    where: { groupId: id, userId, role: "admin" },
  });
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json()) as { email?: string };
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: "No user with that email — they must sign up first." },
      { status: 404 },
    );
  }
  await prisma.studyGroupMember.upsert({
    where: { groupId_userId: { groupId: id, userId: user.id } },
    create: { groupId: id, userId: user.id, role: "member" },
    update: {},
  });
  return NextResponse.json({ ok: true, userId: user.id });
}
