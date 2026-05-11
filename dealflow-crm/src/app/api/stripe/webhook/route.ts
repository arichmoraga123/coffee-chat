import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripeServerClient } from "@/lib/stripe";

export const runtime = "nodejs";

function toDate(ts?: number | null) {
  return ts ? new Date(ts * 1000) : null;
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  const stripe = getStripeServerClient();
  const payload = await req.text();
  const signature = (await headers()).get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (e) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${e}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const clubId = session.metadata?.clubId;
    if (clubId) {
      await prisma.club.update({
        where: { id: clubId },
        data: {
          stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
          stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null,
          stripePriceId: session.metadata?.priceId ?? null,
          subscriptionStatus: "trialing",
        },
      });
    }
  } else if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
    const trialEnd = (sub as unknown as { trial_end?: number | null }).trial_end;
    await prisma.club.updateMany({
      where: { stripeSubscriptionId: sub.id },
      data: {
        subscriptionStatus: sub.status,
        stripePriceId: sub.items.data[0]?.price.id ?? null,
        currentPeriodEnd: toDate(periodEnd),
        trialEndsAt: toDate(trialEnd ?? null),
      },
    });
  } else if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = (invoice as unknown as { subscription?: string | null }).subscription ?? null;
    if (subscriptionId) {
      await prisma.club.updateMany({
        where: { stripeSubscriptionId: subscriptionId },
        data: { subscriptionStatus: "past_due" },
      });
    }
  }

  return NextResponse.json({ received: true });
}
