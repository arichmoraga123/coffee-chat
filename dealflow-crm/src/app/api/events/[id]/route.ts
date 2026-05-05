import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import {
  deleteRecruitingEventFromExternalCalendars,
  syncRecruitingEventToExternalCalendars,
} from "@/lib/calendar-sync";

const TYPES = ["coffee_chat", "deadline", "interview", "networking", "other"] as const;

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const existing = await prisma.recruitingEvent.findFirst({
    where: { id, userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json()) as Record<string, unknown>;
  const title =
    body.title !== undefined ? String(body.title).trim() : existing.title;
  const dateStr = body.date !== undefined ? String(body.date) : undefined;
  const date = dateStr ? new Date(dateStr) : existing.date;
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }
  const typeRaw = body.type !== undefined ? String(body.type) : existing.type;
  const safeType = TYPES.includes(typeRaw as (typeof TYPES)[number]) ? typeRaw : existing.type;
  const firmName =
    body.firmName !== undefined
      ? body.firmName
        ? String(body.firmName).trim()
        : null
      : existing.firmName;
  const notes =
    body.notes !== undefined ? (body.notes ? String(body.notes).trim() : null) : existing.notes;

  const event = await prisma.recruitingEvent.update({
    where: { id },
    data: { title, date, type: safeType, firmName, notes },
  });
  void syncRecruitingEventToExternalCalendars(userId, event.id);
  return NextResponse.json(event);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.recruitingEvent.findFirst({
    where: { id, userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteRecruitingEventFromExternalCalendars(
    userId,
    existing.googleCalendarEventId,
    existing.outlookCalendarEventId,
  );
  await prisma.recruitingEvent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
