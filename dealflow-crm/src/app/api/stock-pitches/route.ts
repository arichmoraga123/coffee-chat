import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.stockPitch.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      companyName: true,
      recommendation: true,
      updatedAt: true,
      sharedToGroupId: true,
    },
  });
  return NextResponse.json({ pitches: rows });
}

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  const companyName = String(body.companyName ?? "").trim();
  const overview = String(body.overview ?? "").trim();
  const recommendation = String(body.recommendation ?? "").trim();
  if (!companyName || !overview || !["Buy", "Hold", "Sell"].includes(recommendation)) {
    return NextResponse.json({ error: "companyName, overview, and recommendation (Buy/Hold/Sell) required" }, { status: 400 });
  }
  const thesisBullets = Array.isArray(body.thesisBullets)
    ? (body.thesisBullets as unknown[]).map((x) => String(x).trim()).filter(Boolean).slice(0, 5)
    : [];
  const catalysts = Array.isArray(body.catalysts)
    ? (body.catalysts as unknown[]).map((x) => String(x).trim()).filter(Boolean).slice(0, 5)
    : [];
  const risks = Array.isArray(body.risks)
    ? (body.risks as unknown[]).map((x) => String(x).trim()).filter(Boolean).slice(0, 5)
    : [];
  const row = await prisma.stockPitch.create({
    data: {
      userId,
      companyName,
      overview,
      thesisBullets,
      currentPrice: body.currentPrice != null ? String(body.currentPrice).trim() || null : null,
      targetPrice: body.targetPrice != null ? String(body.targetPrice).trim() || null : null,
      catalysts,
      risks,
      recommendation,
    },
  });
  return NextResponse.json(row, { status: 201 });
}
