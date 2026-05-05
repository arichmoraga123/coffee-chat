import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession, requireAdminUserId } from "@/lib/auth";
import { dealDedupeKey } from "@/lib/deal-dedupe";
import { DEAL_TYPE_SET, normalizeVertical } from "@/lib/deal-taxonomy";

/** Members — published deals only. */
export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const dealType = searchParams.get("dealType");
  const sector = searchParams.get("sector");
  const size = searchParams.get("size");
  const vertical = searchParams.get("vertical");
  const where: Record<string, unknown> = { status: "published" };
  if (dealType) where.dealType = dealType;
  if (vertical) where.vertical = vertical;
  if (sector) where.sector = { contains: sector, mode: "insensitive" as const };
  if (size) where.dealValue = { contains: size, mode: "insensitive" as const };
  const deals = await prisma.deal.findMany({
    where: where as never,
    orderBy: { announcedAt: "desc" },
    take: 500,
  });
  const marks = await prisma.dealBookmark.findMany({
    where: { userId },
    select: { dealId: true, notes: true },
  });
  const bookmarkMap = Object.fromEntries(marks.map((m) => [m.dealId, m.notes]));
  return NextResponse.json({ deals, bookmarks: bookmarkMap });
}

/** ADMIN — create a shared deal (manual; published by default). */
export async function POST(req: Request) {
  await requireAdminUserId();
  const body = (await req.json()) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  const summary = String(body.summary ?? "").trim();
  const dealType = String(body.dealType ?? "").trim();
  const announcedRaw = body.announcedAt;
  if (!title || !summary || !DEAL_TYPE_SET.has(dealType)) {
    return NextResponse.json({ error: "title, summary, and a valid dealType required" }, { status: 400 });
  }
  const announcedAt =
    typeof announcedRaw === "string" || announcedRaw instanceof Date
      ? new Date(announcedRaw as string | Date)
      : null;
  if (!announcedAt || Number.isNaN(announcedAt.getTime())) {
    return NextResponse.json({ error: "Invalid announcedAt" }, { status: 400 });
  }

  const acquirer = body.acquirer != null ? String(body.acquirer).trim() || null : null;
  const target = body.target != null ? String(body.target).trim() || null : null;
  const dealValue = body.dealValue != null ? String(body.dealValue).trim() || null : null;
  const sector = body.sector != null ? String(body.sector).trim() || null : null;
  const sourceUrl = body.sourceUrl != null ? String(body.sourceUrl).trim() || null : null;
  const keyThesis = body.keyThesis != null ? String(body.keyThesis).trim() || null : null;
  const risks = body.risks != null ? String(body.risks).trim() || null : null;
  const vertical = normalizeVertical(body.vertical as string | undefined);

  try {
    const row = await prisma.deal.create({
      data: {
        title: title.slice(0, 500),
        acquirer,
        target,
        dealValue,
        dealType,
        vertical,
        sector,
        summary: summary.slice(0, 4000),
        keyThesis: keyThesis ? keyThesis.slice(0, 2000) : null,
        risks: risks ? risks.slice(0, 2000) : null,
        sourceUrl: sourceUrl ? sourceUrl.slice(0, 2000) : null,
        announcedAt,
        dedupeKey: dealDedupeKey(title, announcedAt),
        status: "published",
      },
    });
    return NextResponse.json(row);
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code?: string }).code : "";
    if (code === "P2002") {
      return NextResponse.json({ error: "A deal with this title already exists" }, { status: 409 });
    }
    throw e;
  }
}
