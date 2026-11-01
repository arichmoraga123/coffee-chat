import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

/** { status: "going" | "declined" | "none" } — or no body to toggle Going (older buttons). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ev = await prisma.clubEvent.findUnique({ where: { id } });
  if (!ev) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const member = await prisma.clubMember.findUnique({ where: { clubId_userId: { clubId: ev.clubId, userId } }, select: { active: true } });
  if (!member?.active) return NextResponse.json({ error: "Members only" }, { status: 403 });
  if (!ev.rsvpOn) return NextResponse.json({ error: "RSVPs are off for this event." }, { status: 400 });
  const body = (await req.json().catch(() => ({}))) as { status?: string };
  const status = body.status ?? (ev.rsvpIds.includes(userId) ? "none" : "going");
  const going = ev.rsvpIds.filter((x) => x !== userId);
  const declined = ev.declinedIds.filter((x) => x !== userId);
  if (status === "going") {
    if (ev.capacity && going.length >= ev.capacity) return NextResponse.json({ error: "This event is full." }, { status: 409 });
    going.push(userId);
  } else if (status === "declined") declined.push(userId);
  await prisma.clubEvent.update({ where: { id }, data: { rsvpIds: going, declinedIds: declined } });
  return NextResponse.json({ ok: true, status, rsvp: status === "going", going: going.length, declined: declined.length, count: going.length });
}
