import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { appUrl } from "@/lib/outbound";

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escIcs = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
/** RFC 5545 lines are folded at 75 octets. */
const fold = (line: string) => line.match(/.{1,73}/g)?.join("\r\n ") ?? line;

/** "Add to calendar": a one-event .ics file. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const e = await prisma.clubEvent.findUnique({ where: { id }, include: { club: { select: { name: true } } } });
  if (!e) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const member = await prisma.clubMember.findUnique({ where: { clubId_userId: { clubId: e.clubId, userId } }, select: { active: true } });
  if (!member?.active) return NextResponse.json({ error: "Members only" }, { status: 403 });
  const end = e.endDate ?? new Date(e.date.getTime() + 60 * 60_000);
  const desc = [e.description, e.meetingLink ? `Join: ${e.meetingLink}` : null, appUrl(`/club/events#${e.id}`)].filter(Boolean).join("\n\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Prospect//Club events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.id}@prospect`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(e.date)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escIcs(`${e.club.name}: ${e.title}`)}`,
    e.location || e.meetingLink ? `LOCATION:${escIcs(e.location || e.meetingLink || "")}` : null,
    `DESCRIPTION:${escIcs(desc)}`,
    e.meetingLink ? `URL:${e.meetingLink}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter((l): l is string => Boolean(l))
    .map(fold);
  const name = e.title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "event";
  return new NextResponse(lines.join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.ics"` },
  });
}
