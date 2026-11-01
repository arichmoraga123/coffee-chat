import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

/** { action: "view" | "done" | "undone" } for the signed-in member. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const post = await prisma.clubPost.findUnique({ where: { id }, select: { clubId: true, allowDone: true } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const member = await prisma.clubMember.findUnique({ where: { clubId_userId: { clubId: post.clubId, userId } }, select: { active: true } });
  if (!member?.active) return NextResponse.json({ error: "Members only" }, { status: 403 });
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  const now = new Date();
  if ((action === "done" || action === "undone") && !post.allowDone) return NextResponse.json({ error: "This post can't be marked done." }, { status: 400 });
  const data = action === "done" ? { doneAt: now } : action === "undone" ? { doneAt: null } : {};
  await prisma.clubPostProgress.upsert({
    where: { postId_userId: { postId: id, userId } },
    create: { postId: id, userId, viewedAt: now, ...data },
    update: { ...data, ...(action === "view" ? {} : {}) },
  });
  if (action === "view") await prisma.clubPostProgress.updateMany({ where: { postId: id, userId, viewedAt: null }, data: { viewedAt: now } });
  return NextResponse.json({ ok: true });
}
