import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { getPeBroadClub } from "@/lib/club-roster";

/** A student with a verified @msu.edu email who isn't on the roster asks to join PE@Broad. */
export async function POST() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { eduEmail: true, eduVerified: true } });
  if (!user?.eduVerified || !user.eduEmail?.toLowerCase().endsWith("@msu.edu")) {
    return NextResponse.json({ error: "Verify your @msu.edu email in your profile first." }, { status: 403 });
  }
  const club = await getPeBroadClub();
  const member = await prisma.clubMember.findUnique({ where: { clubId_userId: { clubId: club.id, userId } } });
  if (member?.active) return NextResponse.json({ status: "member" });

  const existing = await prisma.clubJoinRequest.findUnique({ where: { clubId_userId: { clubId: club.id, userId } } });
  if (existing?.status === "pending") return NextResponse.json({ status: "pending" });
  // A denied request can be re-sent; it goes back to pending.
  await prisma.clubJoinRequest.upsert({
    where: { clubId_userId: { clubId: club.id, userId } },
    create: { clubId: club.id, userId },
    update: { status: "pending", createdAt: new Date(), decidedAt: null, decidedBy: null },
  });
  return NextResponse.json({ status: "pending" });
}
