import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const tpl = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!tpl) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const existing = await prisma.templateUpvote.findUnique({
    where: { userId_templateId: { userId, templateId: id } },
  });
  if (existing) {
    await prisma.$transaction([
      prisma.templateUpvote.delete({ where: { id: existing.id } }),
      prisma.emailTemplate.update({ where: { id }, data: { upvotes: { decrement: 1 } } }),
    ]);
    return NextResponse.json({ upvoted: false, upvotes: tpl.upvotes - 1 });
  }
  await prisma.$transaction([
    prisma.templateUpvote.create({ data: { userId, templateId: id } }),
    prisma.emailTemplate.update({ where: { id }, data: { upvotes: { increment: 1 } } }),
  ]);
  const next = await prisma.emailTemplate.findUnique({ where: { id } });
  return NextResponse.json({ upvoted: true, upvotes: next?.upvotes ?? tpl.upvotes + 1 });
}
