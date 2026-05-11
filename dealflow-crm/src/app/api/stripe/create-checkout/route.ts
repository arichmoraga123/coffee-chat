import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { isClubOfficer } from "@/lib/club-server";
import { getStripeServerClient } from "@/lib/stripe";

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as { priceId?: string; clubId?: string; plan?: "club" | "chapter" };
  if (!body.clubId) return NextResponse.json({ error: "clubId required" }, { status: 400 });
  const priceId =
    body.priceId ??
    (body.plan === "chapter" ? process.env.STRIPE_CHAPTER_PRICE_ID : process.env.STRIPE_CLUB_PRICE_ID);
  if (!priceId) return NextResponse.json({ error: "No Stripe price configured for selected plan" }, { status: 400 });

  const role = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const officer = await isClubOfficer(userId, body.clubId);
  if (!officer && role?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const club = await prisma.club.findUnique({ where: { id: body.clubId }, include: { school: true } });
  if (!club) return NextResponse.json({ error: "Club not found" }, { status: 404 });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const stripe = getStripeServerClient();
  let customerId = club.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: `${club.name} (${club.school.shortName})`,
      metadata: { clubId: club.id },
    });
    customerId = customer.id;
    await prisma.club.update({ where: { id: club.id }, data: { stripeCustomerId: customerId } });
  }

  const origin = new URL(req.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 14, metadata: { clubId: club.id } },
    success_url: `${origin}/club?subscription=success`,
    cancel_url: `${origin}/pricing`,
    allow_promotion_codes: true,
    metadata: { clubId: club.id, createdBy: userId, priceId },
  });

  return NextResponse.json({ url: session.url });
}
