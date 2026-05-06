import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { isClubOfficer, resolveClubIdForUser } from "@/lib/club-server";

export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  let clubId = searchParams.get("clubId");
  const type = searchParams.get("type");
  if (!clubId) clubId = await resolveClubIdForUser(userId);
  if (!clubId) return NextResponse.json({ posts: [] });

  const posts = await prisma.clubPost.findMany({
    where: {
      clubId,
      ...(type && type !== "all" ? { type } : {}),
    },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: { author: { select: { name: true } } },
  });

  return NextResponse.json({ clubId, posts });
}

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    clubId?: string;
    title?: string;
    content?: string;
    type?: string;
    dueDate?: string | null;
    driveLink?: string | null;
  };

  const clubId = body.clubId ?? (await resolveClubIdForUser(userId));
  if (!clubId) return NextResponse.json({ error: "No club" }, { status: 400 });

  const officer = await isClubOfficer(userId, clubId);
  const member = await prisma.clubMember.findUnique({
    where: { clubId_userId: { clubId, userId } },
  });
  if (!officer && !member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();
  const postType = String(body.type ?? "announcement").trim() || "announcement";
  if (!title || !content) return NextResponse.json({ error: "Title and content required" }, { status: 400 });

  const dueDate =
    body.dueDate && !Number.isNaN(Date.parse(body.dueDate)) ? new Date(body.dueDate) : undefined;

  const row = await prisma.clubPost.create({
    data: {
      clubId,
      authorId: userId,
      title,
      content,
      type: postType,
      dueDate: dueDate ?? null,
      driveLink: body.driveLink?.trim() || null,
    },
    include: { author: { select: { name: true } } },
  });

  return NextResponse.json(row);
}
