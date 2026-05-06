import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.compDataUpvote.create({
        data: { userId, compId: id },
      });
      await tx.compData.update({
        where: { id },
        data: { upvotes: { increment: 1 } },
      });
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Already upvoted or invalid entry" }, { status: 409 });
  }

  const row = await prisma.compData.findUnique({ where: { id }, select: { upvotes: true } });
  return NextResponse.json({ ok: true, upvotes: row?.upvotes ?? 0 });
}
