import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { peBroadMembership } from "@/lib/club-social";

export const REACTIONS = ["👏", "🔥", "💪", "🎯", "😂"] as const;
const Body = z.object({ activityId: z.string().min(1), emoji: z.enum(REACTIONS).nullable() });

/** One emoji reaction per member per item; sending null removes it. */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const m = await peBroadMembership(userId);
  if (!m) return NextResponse.json({ error: "Members only" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { activityId, emoji } = parsed.data;
  const item = await prisma.clubActivity.findFirst({ where: { id: activityId, clubId: m.clubId }, select: { id: true } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (emoji === null) {
    await prisma.clubActivityReaction.deleteMany({ where: { activityId, userId } });
  } else {
    await prisma.clubActivityReaction.upsert({
      where: { activityId_userId: { activityId, userId } },
      create: { activityId, userId, emoji },
      update: { emoji },
    });
  }
  return NextResponse.json({ ok: true });
}
