import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUserId } from "@/lib/auth";
import { dealDedupeKey } from "@/lib/deal-dedupe";

const DEAL_TYPES = new Set(["M&A", "LBO", "IPO", "Recap"]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdminUserId();
  const { id } = await params;
  const existing = await prisma.deal.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json()) as Record<string, unknown>;
  const title =
    body.title !== undefined ? String(body.title).trim().slice(0, 500) : existing.title;
  const summary =
    body.summary !== undefined ? String(body.summary).trim().slice(0, 4000) : existing.summary;
  const dealTypeRaw = body.dealType !== undefined ? String(body.dealType).trim() : existing.dealType;
  if (!DEAL_TYPES.has(dealTypeRaw)) {
    return NextResponse.json({ error: "dealType must be M&A, LBO, IPO, or Recap" }, { status: 400 });
  }

  let announcedAt = existing.announcedAt;
  if (body.announcedAt !== undefined) {
    const d = new Date(String(body.announcedAt));
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Invalid announcedAt" }, { status: 400 });
    }
    announcedAt = d;
  }

  const acquirer =
    body.acquirer !== undefined
      ? String(body.acquirer).trim() || null
      : existing.acquirer;
  const target =
    body.target !== undefined ? String(body.target).trim() || null : existing.target;
  const dealValue =
    body.dealValue !== undefined
      ? String(body.dealValue).trim() || null
      : existing.dealValue;
  const sector =
    body.sector !== undefined ? String(body.sector).trim() || null : existing.sector;
  const sourceUrl =
    body.sourceUrl !== undefined
      ? String(body.sourceUrl).trim().slice(0, 2000) || null
      : existing.sourceUrl;
  const keyThesis =
    body.keyThesis !== undefined
      ? String(body.keyThesis).trim().slice(0, 2000) || null
      : existing.keyThesis;
  const risks =
    body.risks !== undefined ? String(body.risks).trim().slice(0, 2000) || null : existing.risks;

  const dedupeKey = dealDedupeKey(title, announcedAt);

  try {
    const row = await prisma.deal.update({
      where: { id },
      data: {
        title,
        acquirer,
        target,
        dealValue,
        dealType: dealTypeRaw,
        sector,
        summary,
        keyThesis,
        risks,
        sourceUrl,
        announcedAt,
        dedupeKey,
      },
    });
    return NextResponse.json(row);
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? (e as { code?: string }).code : "";
    if (code === "P2002") {
      return NextResponse.json({ error: "Title conflicts with another deal" }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdminUserId();
  const { id } = await params;
  await prisma.deal.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
