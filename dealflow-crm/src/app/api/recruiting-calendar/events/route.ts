import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { buildRecruitingCalendarWhere } from "@/lib/recruiting-calendar-utils";
import { createHash } from "node:crypto";

export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const yearRaw = searchParams.get("year");
  const vertical = searchParams.get("vertical") ?? "all";
  const year = yearRaw ? Number(yearRaw) : undefined;

  const where = buildRecruitingCalendarWhere({
    year: year !== undefined && !Number.isNaN(year) ? year : undefined,
    vertical,
  });

  const events = await prisma.recruitingCalendarEvent.findMany({
    where,
    orderBy: [{ date: "asc" }, { title: "asc" }],
  });

  const votes = await prisma.recruitingCalendarVote.findMany({
    where: { userId },
    select: { eventId: true },
  });
  const voted = new Set(votes.map((v) => v.eventId));

  return NextResponse.json({
    events: events.map((e) => ({
      ...e,
      date: e.date.toISOString(),
      endDate: e.endDate?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
      userVoted: voted.has(e.id),
    })),
  });
}

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
  const date = body.date ? new Date(String(body.date)) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }
  const year = body.year != null ? Number(body.year) : date.getFullYear();
  if (Number.isNaN(year)) return NextResponse.json({ error: "year invalid" }, { status: 400 });
  const eventType = String(body.eventType ?? "").trim();
  if (!eventType) return NextResponse.json({ error: "eventType required" }, { status: 400 });

  const dedupeKey = createHash("sha256")
    .update(`${title}|${year}|${eventType}|${date.toISOString().slice(0, 10)}`)
    .digest("hex");

  try {
    const row = await prisma.recruitingCalendarEvent.create({
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
        submittedBy: userId,
        verified: false,
        dedupeKey,
      },
    });
    return NextResponse.json(
      {
        event: {
          ...row,
          date: row.date.toISOString(),
          endDate: row.endDate?.toISOString() ?? null,
          createdAt: row.createdAt.toISOString(),
          userVoted: false,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Duplicate or invalid submission" }, { status: 409 });
  }
}
