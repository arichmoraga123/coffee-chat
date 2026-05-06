import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ann = await prisma.clubAnnouncement.findUnique({ where: { id } });
  if (!ann) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const readBy = ann.readBy.includes(userId) ? ann.readBy : [...ann.readBy, userId];
  await prisma.clubAnnouncement.update({ where: { id }, data: { readBy } });

  return NextResponse.json({ ok: true, readCount: readBy.length });
}
