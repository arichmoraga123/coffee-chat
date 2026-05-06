import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { isClubOfficer, resolveClubIdForUser } from "@/lib/club-server";

export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  let clubId = searchParams.get("clubId");
  if (!clubId) clubId = await resolveClubIdForUser(userId);
  if (!clubId) return NextResponse.json({ announcements: [] });

  const rows = await prisma.clubAnnouncement.findMany({
    where: { clubId },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: { author: { select: { name: true } } },
  });

  return NextResponse.json({ clubId, announcements: rows });
}

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { clubId?: string; title?: string; body?: string };
  const clubId = body.clubId ?? (await resolveClubIdForUser(userId));
  if (!clubId) return NextResponse.json({ error: "No club context" }, { status: 400 });

  const allowed = await isClubOfficer(userId, clubId);
  if (!allowed) return NextResponse.json({ error: "Officers only" }, { status: 403 });

  const title = String(body.title ?? "").trim();
  const text = String(body.body ?? "").trim();
  if (!title || !text) return NextResponse.json({ error: "Title and body required" }, { status: 400 });

  const row = await prisma.clubAnnouncement.create({
    data: { clubId, authorId: userId, title, body: text },
    include: { author: { select: { name: true } } },
  });

  return NextResponse.json(row);
}
