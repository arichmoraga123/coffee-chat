import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const doc = await prisma.vaultDocument.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const existing = await prisma.vaultDocumentUpvote.findUnique({
    where: { userId_documentId: { userId, documentId: id } },
  });
  if (existing) {
    await prisma.$transaction([
      prisma.vaultDocumentUpvote.delete({ where: { id: existing.id } }),
      prisma.vaultDocument.update({ where: { id }, data: { upvotes: { decrement: 1 } } }),
    ]);
    const next = await prisma.vaultDocument.findUnique({ where: { id } });
    return NextResponse.json({ upvoted: false, upvotes: next?.upvotes ?? 0 });
  }
  await prisma.$transaction([
    prisma.vaultDocumentUpvote.create({ data: { userId, documentId: id } }),
    prisma.vaultDocument.update({ where: { id }, data: { upvotes: { increment: 1 } } }),
  ]);
  const next = await prisma.vaultDocument.findUnique({ where: { id } });
  return NextResponse.json({ upvoted: true, upvotes: next?.upvotes ?? doc.upvotes + 1 });
}
