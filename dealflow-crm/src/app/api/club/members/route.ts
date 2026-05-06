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
  if (!clubId) return NextResponse.json({ members: [] });

  const viewerOfficer = await isClubOfficer(userId, clubId);

  const rows = await prisma.clubMember.findMany({
    where: { clubId },
    orderBy: { joinedAt: "asc" },
    include: {
      user: { select: { id: true, name: true, email: true, careerTracks: true } },
    },
  });

  const members = rows.map((r) => ({
    id: r.id,
    role: r.role,
    joinedAt: r.joinedAt,
    name: r.user.name,
    email: viewerOfficer ? r.user.email : undefined,
    careerTracks: r.user.careerTracks,
  }));

  return NextResponse.json({ clubId, members, viewerOfficer });
}
