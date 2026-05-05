import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUserId } from "@/lib/auth";
import { createHash } from "node:crypto";

export async function GET() {
  await requireAdminUserId();
  const events = await prisma.recruitingCalendarEvent.findMany({
    orderBy: [{ date: "asc" }, { title: "asc" }],
    take: 2000,
  });
  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  await requireAdminUserId();
  const body = (await req.json()) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  const date = body.date ? new Date(String(body.date)) : null;
  const eventType = String(body.eventType ?? "").trim();
  const year = body.year != null ? Number(body.year) : date?.getFullYear();
  if (!title || !date || Number.isNaN(date.getTime()) || !eventType || year == null || Number.isNaN(year)) {
    return NextResponse.json({ error: "title, date, eventType, year required" }, { status: 400 });
  }

  const dedupeKey = body.dedupeKey
    ? String(body.dedupeKey)
    : createHash("sha256")
        .update(`${title}|${year}|${eventType}|${date.toISOString().slice(0, 10)}`)
        .digest("hex");

  const row = await prisma.recruitingCalendarEvent
    .create({
      data: {
        title,
        firmName: body.firmName ? String(body.firmName).trim() : null,
        vertical: body.vertical ? String(body.vertical).trim() : null,
        eventType,
        date,
        endDate: body.endDate ? new Date(String(body.endDate)) : null,
        year,
        isRecurring: Boolean(body.isRecurring),
        notes: body.notes ? String(body.notes).trim() : null,
        sourceUrl: body.sourceUrl ? String(body.sourceUrl).trim() : null,
        verified: Boolean(body.verified),
        dedupeKey,
      },
    })
    .catch(() => null);
  if (!row) return NextResponse.json({ error: "create failed (duplicate?)" }, { status: 409 });
  return NextResponse.json({ event: row }, { status: 201 });
}
