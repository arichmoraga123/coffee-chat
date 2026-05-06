import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { resolveClubIdForUser } from "@/lib/club-server";

export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  let clubId = searchParams.get("clubId");
  if (!clubId) clubId = await resolveClubIdForUser(userId);
  if (!clubId) return NextResponse.json({ projects: [] });

  const projects = await prisma.clubProject.findMany({
    where: { clubId },
    orderBy: { createdAt: "desc" },
    include: { deliverables: true },
  });

  return NextResponse.json({ clubId, projects });
}
