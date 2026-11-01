import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { peBroadMembership } from "@/lib/club-social";
import { advanceLive, expireIfDue, loadChallenge, recordAnswer } from "@/lib/challenges";

const Body = z.object({ questionId: z.string().min(1), chosenText: z.string().max(2000), ms: z.number().nonnegative().optional() });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  let c = await loadChallenge(id);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  c = await expireIfDue(c);
  const { questionId, chosenText } = parsed.data;
  let ms = parsed.data.ms ?? 0;

  // Weekly: any active member can join by answering.
  if (c.mode === "weekly") {
    const m = await peBroadMembership(userId);
    if (!m || m.clubId !== c.clubId) return NextResponse.json({ error: "Members only" }, { status: 403 });
    if (c.status === "complete") return NextResponse.json({ error: "This week's challenge is closed." }, { status: 409 });
    await prisma.challengeParticipant.upsert({ where: { challengeId_userId: { challengeId: id, userId } }, create: { challengeId: id, userId }, update: {} });
    c = (await loadChallenge(id))!;
  }
  const me = c.participants.find((p) => p.userId === userId);
  if (!me) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (me.finishedAt) return NextResponse.json({ error: "You've already finished." }, { status: 409 });
  if (!c.questionIds.includes(questionId)) return NextResponse.json({ error: "Not in this challenge." }, { status: 400 });

  let late = false;
  if (c.mode === "live") {
    c = await advanceLive(c);
    if (c.status !== "live") return NextResponse.json({ error: "The duel isn't running." }, { status: 409 });
    if (c.questionIds[c.currentIndex] !== questionId) return NextResponse.json({ error: "That question is over." }, { status: 409 });
    // Server clock decides: answers after the 30 seconds count as wrong.
    const elapsed = Date.now() - (c.questionStartedAt?.getTime() ?? Date.now());
    late = elapsed > c.secondsPerQ * 1000;
    ms = Math.min(elapsed, c.secondsPerQ * 1000);
  } else {
    const okStatus = c.mode === "weekly" ? c.status === "accepted" : c.status === "accepted" || (c.status === "pending" && c.createdById === userId);
    if (!okStatus) return NextResponse.json({ error: "Accept the challenge first." }, { status: 409 });
    // Questions are answered in order.
    const done = await prisma.challengeAnswer.count({ where: { challengeId: id, userId } });
    if (c.questionIds[done] !== questionId) return NextResponse.json({ error: "Answer the current question." }, { status: 409 });
  }

  const r = await recordAnswer(c, userId, questionId, chosenText, ms, late);
  if (r.duplicate) return NextResponse.json({ error: "Already answered." }, { status: 409 });
  if (c.mode === "live") await advanceLive((await loadChallenge(id))!);
  const q = await prisma.question.findUnique({ where: { id: questionId }, select: { options: true, correctIndex: true, explanation: true, lessonId: true } });
  return NextResponse.json({
    correct: r.correct,
    late,
    correctText: q && q.correctIndex !== null ? q.options[q.correctIndex] : "",
    explanation: q?.explanation ?? null,
    lessonId: q?.lessonId ?? null,
  });
}
