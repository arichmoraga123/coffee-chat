import { getUserIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveClubIdForUser } from "@/lib/club-server";
import { SubscriptionBanner } from "@/components/subscription-banner";
import { PageHeader } from "@/components/ui/page-header";
import { SectionTabs } from "@/components/ui/section-tabs";
import { canPost } from "@/lib/club-publish";
import { lessonOptions } from "@/lib/club-view";
import { PostToClubButton } from "@/components/club/publish-dialog";

const weekAgo = () => new Date(new Date().getTime() - 7 * 86_400_000);

export default async function ClubLayout({ children }: { children: React.ReactNode }) {
  const userId = await getUserIdFromSession();
  const clubId = userId ? await resolveClubIdForUser(userId) : null;
  let header: React.ReactNode = null;
  if (clubId) {
    const since = weekAgo();
    const [club, members, activeThisWeek, poster, me] = await Promise.all([
      prisma.club.findUnique({ where: { id: clubId }, select: { name: true, school: { select: { shortName: true } } } }),
      prisma.clubMember.count({ where: { clubId, active: true } }),
      prisma.clubMember.count({ where: { clubId, active: true, user: { lastActiveAt: { gte: since } } } }),
      canPost(userId!, clubId),
      prisma.user.findUnique({ where: { id: userId! }, select: { role: true } }),
    ]);
    if (club) {
      header = (
        <PageHeader
          title={club.name}
          subtitle={`${club.school?.shortName ?? ""} · ${members} members · ${activeThisWeek} active this week`.replace(/^ · /, "")}
          actions={poster ? <PostToClubButton isAdmin={me?.role === "ADMIN"} lessons={lessonOptions()} /> : null}
        />
      );
    }
  }
  return (
    <div className="space-y-6">
      {userId ? <SubscriptionBanner userId={userId} /> : null}
      {header ?? <SectionTabs />}
      {children}
    </div>
  );
}
