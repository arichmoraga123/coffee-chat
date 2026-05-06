import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const post = await prisma.clubPost.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const readBy = post.readBy.includes(userId) ? post.readBy : [...post.readBy, userId];
  await prisma.clubPost.update({ where: { id }, data: { readBy } });

  return NextResponse.json({ ok: true, readCount: readBy.length });
}
