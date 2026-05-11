import { ClubSubnav } from "@/components/club-subnav";
import { getUserIdFromSession } from "@/lib/auth";
import { SubscriptionBanner } from "@/components/subscription-banner";

export default async function ClubLayout({ children }: { children: React.ReactNode }) {
  const userId = await getUserIdFromSession();
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {userId ? <SubscriptionBanner userId={userId} /> : null}
      <ClubSubnav />
      {children}
    </div>
  );
}
