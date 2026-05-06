import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { resolveClubIdForUser } from "@/lib/club-server";

export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  let clubId = searchParams.get("clubId");
  const past = searchParams.get("past") === "1";
  if (!clubId) clubId = await resolveClubIdForUser(userId);
  if (!clubId) return NextResponse.json({ events: [] });

  const now = new Date();
  const events = await prisma.clubEvent.findMany({
    where: {
      clubId,
      ...(past ? { date: { lt: now } } : { date: { gte: now } }),
    },
    orderBy: { date: past ? "desc" : "asc" },
    take: past ? 30 : 50,
  });

  return NextResponse.json({ clubId, events, past });
}
