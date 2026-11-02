import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { openingsAccess, visibleOpeningsWhere } from "@/lib/openings-data";

const Body = z.object({ remindOpen: z.boolean().default(true), remindDaysBefore: z.number().int().min(0).max(60).default(7) });

/** PUT: remind me when it opens and N days before the deadline. DELETE: stop reminding. */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid reminder" }, { status: 400 });
  const { memberClubIds } = await openingsAccess(userId);
  const opening = await prisma.opening.findFirst({ where: { id, ...visibleOpeningsWhere(memberClubIds) }, select: { id: true } });
  if (!opening) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data = { remindOpen: parsed.data.remindOpen, remindDaysBefore: parsed.data.remindDaysBefore, openSentAt: null, deadlineSentAt: null };
  const r = await prisma.openingReminder.upsert({ where: { userId_openingId: { userId, openingId: id } }, update: data, create: { userId, openingId: id, ...data } });
  return NextResponse.json({ reminder: { remindOpen: r.remindOpen, remindDaysBefore: r.remindDaysBefore } });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await prisma.openingReminder.deleteMany({ where: { userId, openingId: id } });
  return NextResponse.json({ ok: true });
}
