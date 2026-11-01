import { getUserIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveClubIdForUser } from "@/lib/club-server";
import { SubscriptionBanner } from "@/components/subscription-banner";
import { PageHeader } from "@/components/ui/page-header";

const weekAgo = () => new Date(new Date().getTime() - 7 * 86_400_000);

export default async function ClubLayout({ children }: { children: React.ReactNode }) {
  const userId = await getUserIdFromSession();
  const clubId = userId ? await resolveClubIdForUser(userId) : null;
  let header: React.ReactNode = null;
  if (clubId) {
    const since = weekAgo();
    const [club, members, activeThisWeek] = await Promise.all([
      prisma.club.findUnique({ where: { id: clubId }, select: { name: true, school: { select: { shortName: true } } } }),
      prisma.clubMember.count({ where: { clubId, active: true } }),
      prisma.clubMember.count({ where: { clubId, active: true, user: { lastActiveAt: { gte: since } } } }),
    ]);
    if (club) {
      header = (
        <PageHeader
          title={club.name}
          subtitle={`${club.school?.shortName ?? ""} · ${members} members · ${activeThisWeek} active this week`.replace(/^ · /, "")}
        />
      );
    }
  }
  return (
    <div className="space-y-6">
      {userId ? <SubscriptionBanner userId={userId} /> : null}
      {header}
      {children}
    </div>
  );
}
