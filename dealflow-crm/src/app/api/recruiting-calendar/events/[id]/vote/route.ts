import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: eventId } = await ctx.params;

  const ev = await prisma.recruitingCalendarEvent.findUnique({
    where: { id: eventId },
    select: { id: true },
  });
  if (!ev) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.recruitingCalendarVote.findUnique({
    where: { userId_eventId: { userId, eventId } },
  });

  if (existing) {
    await prisma.recruitingCalendarVote.delete({
      where: { id: existing.id },
    });
    const cur = await prisma.recruitingCalendarEvent.findUnique({
      where: { id: eventId },
      select: { upvotes: true },
    });
    const nextUp = Math.max(0, (cur?.upvotes ?? 0) - 1);
    const dec = await prisma.recruitingCalendarEvent.update({
      where: { id: eventId },
      data: { upvotes: nextUp },
      select: { upvotes: true },
    });
    return NextResponse.json({ voted: false, upvotes: dec.upvotes });
  }

  await prisma.recruitingCalendarVote.create({
    data: { userId, eventId },
  });
  const inc = await prisma.recruitingCalendarEvent.update({
    where: { id: eventId },
    data: { upvotes: { increment: 1 } },
    select: { upvotes: true },
  });

  return NextResponse.json({ voted: true, upvotes: inc.upvotes });
}
