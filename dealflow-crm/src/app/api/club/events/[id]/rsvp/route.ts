import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ev = await prisma.clubEvent.findUnique({ where: { id } });
  if (!ev) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const has = ev.rsvpIds.includes(userId);
  const rsvpIds = has ? ev.rsvpIds.filter((x) => x !== userId) : [...ev.rsvpIds, userId];
  await prisma.clubEvent.update({ where: { id }, data: { rsvpIds } });

  return NextResponse.json({ ok: true, rsvp: !has, count: rsvpIds.length });
}
