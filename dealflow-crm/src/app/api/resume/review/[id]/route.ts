import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { cleanupFiles } from "../v2";

/** Deletes one stored resume review (and its file, when no other review uses it). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const row = await prisma.resumeReview.findFirst({ where: { id, userId }, select: { id: true, feedback: true } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.resumeReview.delete({ where: { id: row.id } });
  await cleanupFiles(userId, [(row.feedback as { fileUrl?: string } | null)?.fileUrl]);
  return NextResponse.json({ ok: true });
}
