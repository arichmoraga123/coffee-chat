import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { resolveClubIdForUser } from "@/lib/club-server";

export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const clubId = await resolveClubIdForUser(userId);
  if (!clubId) return NextResponse.json({ clubId: null, subscriptionStatus: null });
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, subscriptionStatus: true, trialEndsAt: true, currentPeriodEnd: true, stripePriceId: true },
  });
  return NextResponse.json({
    clubId: club?.id ?? null,
    subscriptionStatus: club?.subscriptionStatus ?? null,
    trialEndsAt: club?.trialEndsAt ?? null,
    currentPeriodEnd: club?.currentPeriodEnd ?? null,
    stripePriceId: club?.stripePriceId ?? null,
  });
}
