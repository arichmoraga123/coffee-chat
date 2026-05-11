import { prisma } from "@/lib/prisma";
import { resolveClubIdForUser, isClubOfficer } from "@/lib/club-server";

export async function SubscriptionBanner({ userId }: { userId: string }) {
  const clubId = await resolveClubIdForUser(userId);
  if (!clubId) return null;
  const officer = await isClubOfficer(userId, clubId);
  if (!officer) return null;
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { subscriptionStatus: true, trialEndsAt: true },
  });
  if (!club?.subscriptionStatus) return null;

  const now = Date.now();
  const daysLeft = club.trialEndsAt ? Math.ceil((club.trialEndsAt.getTime() - now) / (1000 * 60 * 60 * 24)) : null;
  let text: string | null = null;
  if (club.subscriptionStatus === "trialing" && daysLeft !== null && daysLeft <= 3) {
    text = `Your trial ends in ${Math.max(daysLeft, 0)} day(s). Add a payment method to keep access.`;
  } else if (club.subscriptionStatus === "past_due") {
    text = "Payment failed. Update your payment method to maintain access.";
  } else if (club.subscriptionStatus === "canceled") {
    text = "Your subscription has ended. Upgrade to restore club features.";
  }
  if (!text) return null;
  return <div className="rounded border border-amber-600/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">{text}</div>;
}
