import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { getWalkthrough } from "@/lib/walkthroughs-index";
import { canEarnXp } from "@/lib/club-social";

const XP_STEP = 2;
const XP_FINISH = 25;

const body = z.object({
  entries: z.record(z.string().max(80), z.string().max(2000)).refine((e) => Object.keys(e).length <= 3000),
  completedStepIds: z.array(z.string().max(16)).max(2000),
  firstTryStepIds: z.array(z.string().max(16)).max(2000),
});

/** Saves guided-mode progress and awards small XP: +2 per step right on the first try, +25 for finishing. No penalties. */
export async function PUT(req: Request, ctx: { params: Promise<{ key: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { key } = await ctx.params;
  const w = getWalkthrough(key);
  if (!w) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid progress" }, { status: 400 });
  const ids = new Set(w.steps.map((s) => s.id));
  const completed = [...new Set(parsed.data.completedStepIds.filter((id) => ids.has(id)))];
  const done = new Set(completed);
  const firstTry = [...new Set(parsed.data.firstTryStepIds.filter((id) => done.has(id)))];

  const prev = await prisma.workbookProgress.findUnique({ where: { userId_workbookKey: { userId, workbookKey: key } } });
  const prevFirst = new Set(prev?.firstTryStepIds ?? []);
  const newlyFirst = firstTry.filter((id) => !prevFirst.has(id)).length;
  const finished = completed.length === w.steps.length;
  const justFinished = finished && !prev?.completedAt;
  let xp = newlyFirst * XP_STEP + (justFinished ? XP_FINISH : 0);
  if (xp > 0 && !(await canEarnXp(userId))) xp = 0;

  const row = await prisma.workbookProgress.upsert({
    where: { userId_workbookKey: { userId, workbookKey: key } },
    create: { userId, workbookKey: key, entries: parsed.data.entries as Prisma.InputJsonValue, completedStepIds: completed, firstTryStepIds: [...new Set([...prevFirst, ...firstTry])], xpAwarded: xp, completedAt: finished ? new Date() : null },
    update: {
      entries: parsed.data.entries as Prisma.InputJsonValue,
      completedStepIds: completed,
      firstTryStepIds: [...new Set([...prevFirst, ...firstTry])],
      xpAwarded: { increment: xp },
      ...(justFinished ? { completedAt: new Date() } : {}),
    },
  });
  if (xp > 0) {
    const u = await prisma.user.update({ where: { id: userId }, data: { xp: { increment: xp }, weeklyXP: { increment: xp } }, select: { name: true, xp: true, weeklyXP: true, drillStreak: true } });
    await prisma.leaderboardEntry.upsert({
      where: { userId },
      create: { userId, username: u.name, weeklyXP: u.weeklyXP, totalXP: u.xp, streak: u.drillStreak },
      update: { username: u.name, weeklyXP: u.weeklyXP, totalXP: u.xp, streak: u.drillStreak },
    });
  }
  return NextResponse.json({ ok: true, xpGained: xp, finished: Boolean(row.completedAt) });
}
