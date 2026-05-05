import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUserId } from "@/lib/auth";
import { dealDedupeKey } from "@/lib/deal-dedupe";
import { DEAL_TYPE_SET, VERTICAL_SET } from "@/lib/deal-taxonomy";

const STATUS_SET = new Set(["draft", "published"]);

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

  const dealTypeNext =
    body.dealType !== undefined ? String(body.dealType).trim() : existing.dealType;
  if (!DEAL_TYPE_SET.has(dealTypeNext)) {
    return NextResponse.json({ error: "Invalid dealType" }, { status: 400 });
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

  let vertical: string | null = existing.vertical;
  if ("vertical" in body) {
    const v = body.vertical;
    if (v === null || v === "") {
      vertical = null;
    } else {
      const s = String(v).trim();
      if (!VERTICAL_SET.has(s)) {
        return NextResponse.json({ error: "Invalid vertical" }, { status: 400 });
      }
      vertical = s;
    }
  }

  let status = existing.status;
  if ("status" in body) {
    const s = String(body.status ?? "").trim();
    if (!STATUS_SET.has(s)) {
      return NextResponse.json({ error: 'status must be "draft" or "published"' }, { status: 400 });
    }
    status = s;
  }

  const dedupeKey = dealDedupeKey(title, announcedAt);

  try {
    const row = await prisma.deal.update({
      where: { id },
      data: {
        title,
        acquirer,
        target,
        dealValue,
        dealType: dealTypeNext,
        vertical,
        sector,
        summary,
        keyThesis,
        risks,
        sourceUrl,
        announcedAt,
        dedupeKey,
        status,
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
