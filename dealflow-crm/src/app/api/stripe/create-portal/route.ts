import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { resolveClubIdForUser, isClubOfficer } from "@/lib/club-server";
import { getStripeServerClient } from "@/lib/stripe";

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { clubId?: string };
  const clubId = body.clubId ?? (await resolveClubIdForUser(userId));
  if (!clubId) return NextResponse.json({ error: "Club not found" }, { status: 404 });
  const role = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const officer = await isClubOfficer(userId, clubId);
  if (!officer && role?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { stripeCustomerId: true } });
  if (!club?.stripeCustomerId) return NextResponse.json({ error: "No Stripe customer found" }, { status: 400 });

  const stripe = getStripeServerClient();
  const origin = new URL(req.url).origin;
  const portal = await stripe.billingPortal.sessions.create({
    customer: club.stripeCustomerId,
    return_url: `${origin}/club`,
  });
  return NextResponse.json({ url: portal.url });
}
