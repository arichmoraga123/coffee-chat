import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { conversationFor } from "@/lib/dm";

/** "Report to admin": files a content report admins see on the moderation queue. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = z.object({ reason: z.string().trim().min(3).max(1000) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Say briefly what happened." }, { status: 400 });
  if (!(await conversationFor(userId, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.contentReport.create({ data: { reporterId: userId, targetType: "conversation", targetId: id, reason: parsed.data.reason } });
  return NextResponse.json({ ok: true });
}
