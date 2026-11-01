import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { peBroadMembership } from "@/lib/club-social";
import { advanceLive, challengeView, expireIfDue, loadChallenge } from "@/lib/challenges";

/** Polled by the challenge screen (every second during a live duel). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  let c = await loadChallenge(id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isParticipant = c.participants.some((p) => p.userId === userId);
  if (!isParticipant) {
    const m = c.mode === "weekly" ? await peBroadMembership(userId) : null;
    if (!m || m.clubId !== c.clubId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  c = await expireIfDue(c);
  if (c.mode === "live" && isParticipant) {
    await prisma.challengeParticipant.update({ where: { challengeId_userId: { challengeId: id, userId } }, data: { lastSeenAt: new Date() } });
    c = await advanceLive((await loadChallenge(id))!);
  }
  return NextResponse.json(await challengeView(c, userId));
}
