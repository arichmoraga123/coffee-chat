import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const timeline = await prisma.firmTimeline.findUnique({ where: { id } });
  if (!timeline) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const existing = await prisma.firmTimelineVote.findUnique({
    where: { userId_timelineId: { userId, timelineId: id } },
  });
  if (existing) {
    return NextResponse.json({ upvotes: timeline.upvotes, voted: true });
  }

  await prisma.$transaction([
    prisma.firmTimelineVote.create({ data: { userId, timelineId: id } }),
    prisma.firmTimeline.update({
      where: { id },
      data: { upvotes: { increment: 1 } },
    }),
  ]);

  const updated = await prisma.firmTimeline.findUnique({
    where: { id },
    select: { upvotes: true },
  });
  return NextResponse.json({ upvotes: updated?.upvotes ?? 0, voted: true });
}
