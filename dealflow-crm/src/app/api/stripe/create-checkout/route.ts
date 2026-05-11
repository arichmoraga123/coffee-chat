import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { isClubOfficer, resolveClubIdForUser } from "@/lib/club-server";
import { getStripeServerClient } from "@/lib/stripe";

export async function POST(req: Request) {
  console.log("[stripe/create-checkout] start");
  try {
    const userId = await getUserIdFromSession();
    if (!userId) {
      console.log("[stripe/create-checkout] unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = (await req.json()) as { priceId?: string; clubId?: string; plan?: "club" | "chapter" };
    const clubId =
      (typeof body.clubId === "string" && body.clubId.trim() ? body.clubId.trim() : null) ??
      (await resolveClubIdForUser(userId));
    if (!clubId) {
      console.log("[stripe/create-checkout] no club resolved");
      return NextResponse.json(
        {
          error:
            "No club found for your account. Set your school on your profile or join a club from the Club hub, then try again.",
        },
        { status: 400 },
      );
    }
    const plan: "club" | "chapter" = body.plan === "chapter" ? "chapter" : "club";
    const priceId =
      body.priceId?.trim() ||
      (plan === "chapter" ? process.env.STRIPE_CHAPTER_PRICE_ID : process.env.STRIPE_CLUB_PRICE_ID);
    if (!priceId) {
      console.log("[stripe/create-checkout] missing price env", plan);
      return NextResponse.json({ error: "No Stripe price configured for selected plan" }, { status: 400 });
    }

    const role = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const officer = await isClubOfficer(userId, clubId);
    if (!officer && role?.role !== "ADMIN") {
      console.log("[stripe/create-checkout] forbidden — not officer", { userId, clubId });
      return NextResponse.json(
        { error: "Only club officers (president, VP, or sector head) can start a subscription for this club." },
        { status: 403 },
      );
    }

    const club = await prisma.club.findUnique({ where: { id: clubId }, include: { school: true } });
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

    if (!session.url) {
      console.error("[stripe/create-checkout] session missing url", session.id);
      return NextResponse.json({ error: "Stripe did not return a checkout URL" }, { status: 500 });
    }
    console.log("[stripe/create-checkout] success", { sessionId: session.id, clubId: club.id });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[stripe/create-checkout] error", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Checkout failed" }, { status: 500 });
  }
}
