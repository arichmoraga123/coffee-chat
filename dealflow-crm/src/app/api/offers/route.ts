import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

/** PRIVATE per user. */
export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.offerComparison.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ comparisons: rows });
}

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  const offers = body.offers;
  if (!Array.isArray(offers) || offers.length === 0) {
    return NextResponse.json({ error: "offers array required" }, { status: 400 });
  }
  const row = await prisma.offerComparison.create({
    data: {
      userId,
      offers: offers as object,
      aiAnalysis: body.aiAnalysis ? String(body.aiAnalysis) : null,
    },
  });
  return NextResponse.json(row);
}
