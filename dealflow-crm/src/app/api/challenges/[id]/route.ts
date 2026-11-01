import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { expireIfDue, loadChallenge } from "@/lib/challenges";

/** accept / decline (the invited player), ready (live lobby). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = z.object({ action: z.enum(["accept", "decline", "ready"]) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  let c = await loadChallenge(id);
  if (!c || !c.participants.some((p) => p.userId === userId)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  c = await expireIfDue(c);
  const { action } = parsed.data;

  if (action === "accept" || action === "decline") {
    if (c.status !== "pending" || c.createdById === userId) return NextResponse.json({ error: "This challenge can't be changed now." }, { status: 409 });
    await prisma.challenge.update({ where: { id }, data: { status: action === "accept" ? "accepted" : "declined" } });
    return NextResponse.json({ ok: true });
  }

  // ready (live duels)
  if (c.mode !== "live" || c.status !== "accepted") return NextResponse.json({ error: "Not in the lobby." }, { status: 409 });
  await prisma.challengeParticipant.update({ where: { challengeId_userId: { challengeId: id, userId } }, data: { ready: true, lastSeenAt: new Date() } });
  const notReady = await prisma.challengeParticipant.count({ where: { challengeId: id, ready: false } });
  if (notReady === 0) {
    await prisma.challenge.updateMany({ where: { id, status: "accepted" }, data: { status: "live", currentIndex: 0, questionStartedAt: new Date() } });
  }
  return NextResponse.json({ ok: true });
}
