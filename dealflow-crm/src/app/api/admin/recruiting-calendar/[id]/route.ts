import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUserId } from "@/lib/auth";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdminUserId();
  const { id } = await ctx.params;
  const body = (await req.json()) as Record<string, unknown>;

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.firmName !== undefined) data.firmName = body.firmName ? String(body.firmName).trim() : null;
  if (body.vertical !== undefined) data.vertical = body.vertical ? String(body.vertical).trim() : null;
  if (body.eventType !== undefined) data.eventType = String(body.eventType).trim();
  if (body.date !== undefined) {
    const d = new Date(String(body.date));
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "bad date" }, { status: 400 });
    data.date = d;
  }
  if (body.endDate !== undefined)
    data.endDate = body.endDate ? new Date(String(body.endDate)) : null;
  if (body.year !== undefined) data.year = Number(body.year);
  if (body.isRecurring !== undefined) data.isRecurring = Boolean(body.isRecurring);
  if (body.notes !== undefined) data.notes = body.notes ? String(body.notes).trim() : null;
  if (body.sourceUrl !== undefined) data.sourceUrl = body.sourceUrl ? String(body.sourceUrl).trim() : null;
  if (body.verified !== undefined) data.verified = Boolean(body.verified);

  try {
    const row = await prisma.recruitingCalendarEvent.update({
      where: { id },
      data: data as never,
    });
    return NextResponse.json({ event: row });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireAdminUserId();
  const { id } = await ctx.params;
  await prisma.recruitingCalendarEvent.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
