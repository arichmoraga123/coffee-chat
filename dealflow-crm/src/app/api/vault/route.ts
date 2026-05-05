import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

/** SHARED metadata + Drive links; submitter id stored for moderation (not shown in UI). */
export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const targetFirm = searchParams.get("targetFirm");
  const outcome = searchParams.get("outcome");
  const year = searchParams.get("year");
  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (targetFirm) where.targetFirm = { contains: targetFirm, mode: "insensitive" };
  if (outcome) where.outcome = outcome;
  if (year && Number.isFinite(Number(year))) where.year = Number(year);
  const docs = await prisma.vaultDocument.findMany({
    where: where as never,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      type: true,
      targetFirm: true,
      targetRole: true,
      outcome: true,
      year: true,
      school: true,
      fileUrl: true,
      notes: true,
      upvotes: true,
      createdAt: true,
    },
  });
  const ups = await prisma.vaultDocumentUpvote.findMany({
    where: { userId },
    select: { documentId: true },
  });
  return NextResponse.json({ documents: docs, upvoted: ups.map((u) => u.documentId) });
}

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  const type = String(body.type ?? "").trim();
  const fileUrl = String(body.fileUrl ?? "").trim();
  if (!type || !fileUrl) return NextResponse.json({ error: "type and fileUrl required" }, { status: 400 });
  const doc = await prisma.vaultDocument.create({
    data: {
      type,
      targetFirm: body.targetFirm ? String(body.targetFirm).trim() : null,
      targetRole: body.targetRole ? String(body.targetRole).trim() : null,
      outcome: body.outcome ? String(body.outcome).trim() : null,
      year: body.year != null ? Number(body.year) : null,
      school: body.school ? String(body.school).trim() : null,
      fileUrl,
      notes: body.notes ? String(body.notes).trim() : null,
      submittedById: userId,
    },
  });
  return NextResponse.json(doc);
}
