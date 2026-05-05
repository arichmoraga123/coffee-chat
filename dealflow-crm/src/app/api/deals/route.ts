import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

/** SHARED deal feed. */
export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const dealType = searchParams.get("dealType");
  const sector = searchParams.get("sector");
  const size = searchParams.get("size");
  const where: Record<string, unknown> = {};
  if (dealType) where.dealType = dealType;
  if (sector) where.sector = { contains: sector, mode: "insensitive" as const };
  if (size) where.dealValue = { contains: size, mode: "insensitive" as const };
  const deals = await prisma.deal.findMany({
    where: where as never,
    orderBy: { announcedAt: "desc" },
    take: 100,
  });
  const marks = await prisma.dealBookmark.findMany({
    where: { userId },
    select: { dealId: true, notes: true },
  });
  const bookmarkMap = Object.fromEntries(marks.map((m) => [m.dealId, m.notes]));
  return NextResponse.json({ deals, bookmarks: bookmarkMap });
}
