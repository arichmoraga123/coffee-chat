import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { conversationFor, sendMessage, MAX_MESSAGE } from "@/lib/dm";

type Ctx = { params: Promise<{ id: string }> };

/** Messages (optionally only those after ?after=ISO). Opening the thread marks it read. */
export async function GET(req: Request, ctx: Ctx) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const conv = await conversationFor(userId, id);
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const afterRaw = new URL(req.url).searchParams.get("after");
  const after = afterRaw ? new Date(afterRaw) : null;
  const messages = await prisma.message.findMany({
    where: { conversationId: id, ...(after && !isNaN(after.getTime()) ? { createdAt: { gt: after } } : {}) },
    orderBy: { createdAt: after ? "asc" : "desc" },
    take: after ? 100 : 200,
    select: { id: true, senderId: true, body: true, kind: true, challengeId: true, createdAt: true },
  });
  if (!after) messages.reverse();
  await prisma.conversationMember.update({ where: { conversationId_userId: { conversationId: id, userId } }, data: { lastReadAt: new Date() } });
  const me = conv.members.find((m) => m.userId === userId)!;
  const other = conv.members.find((m) => m.userId !== userId);
  return NextResponse.json({
    messages,
    other: other?.user ?? null,
    muted: me.muted,
    blockedByMe: me.blocked,
    blockedByThem: Boolean(other?.blocked),
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = z.object({ body: z.string().max(MAX_MESSAGE + 100) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const r = await sendMessage(userId, id, parsed.data.body);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r);
}

/** Mute or block (from my side). */
export async function PATCH(req: Request, ctx: Ctx) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = z.object({ muted: z.boolean().optional(), blocked: z.boolean().optional() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const conv = await conversationFor(userId, id);
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.conversationMember.update({ where: { conversationId_userId: { conversationId: id, userId } }, data: parsed.data });
  return NextResponse.json({ ok: true });
}
