import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const row = await prisma.stockPitch.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.userId === userId) return NextResponse.json({ pitch: row });
  if (row.sharedToGroupId) {
    const member = await prisma.studyGroupMember.findUnique({
      where: { groupId_userId: { groupId: row.sharedToGroupId, userId } },
    });
    if (member) return NextResponse.json({ pitch: row });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.stockPitch.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (typeof body.companyName === "string" && body.companyName.trim()) data.companyName = body.companyName.trim();
  if (typeof body.overview === "string") data.overview = body.overview.trim();
  if (typeof body.recommendation === "string" && ["Buy", "Hold", "Sell"].includes(body.recommendation)) {
    data.recommendation = body.recommendation;
  }
  if (Array.isArray(body.thesisBullets)) {
    data.thesisBullets = (body.thesisBullets as unknown[]).map((x) => String(x).trim()).filter(Boolean).slice(0, 5);
  }
  if (Array.isArray(body.catalysts)) {
    data.catalysts = (body.catalysts as unknown[]).map((x) => String(x).trim()).filter(Boolean).slice(0, 5);
  }
  if (Array.isArray(body.risks)) {
    data.risks = (body.risks as unknown[]).map((x) => String(x).trim()).filter(Boolean).slice(0, 5);
  }
  if (body.currentPrice !== undefined) data.currentPrice = body.currentPrice ? String(body.currentPrice).trim() : null;
  if (body.targetPrice !== undefined) data.targetPrice = body.targetPrice ? String(body.targetPrice).trim() : null;
  if (typeof body.deckOutline === "string") data.deckOutline = body.deckOutline.trim() || null;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  const row = await prisma.stockPitch.update({ where: { id }, data });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.stockPitch.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.stockPitch.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
