import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };

const Body = z.object({
  rawText: z.string().max(12000).optional(),
  title: z.string().max(120).optional(),
  /** The student can edit the cleaned-up version by hand. */
  polished: z
    .object({
      title: z.string().max(120),
      situation: z.string().max(3000),
      task: z.string().max(3000),
      action: z.string().max(5000),
      result: z.string().max(3000),
      oneLiner: z.string().max(400),
      twoMinute: z.string().max(5000),
      followUps: z.array(z.string().max(400)).max(10).optional(),
    })
    .optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const story = await prisma.story.findFirst({ where: { id, userId }, select: { id: true } });
  if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { polished, ...rest } = parsed.data;
  const updated = await prisma.story.update({
    where: { id },
    data: { ...rest, ...(polished ? { polished: polished as Prisma.InputJsonValue, title: polished.title } : {}) },
  });
  return NextResponse.json({ story: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  await prisma.story.deleteMany({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
