import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { peBroadMembership, SOCIAL_USER_WHERE } from "@/lib/club-social";
import { modules } from "@/lib/learn/lessons";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { NewChallengeForm } from "@/components/challenges/new-challenge-form";

export const dynamic = "force-dynamic";

export default async function NewChallengePage({ searchParams }: { searchParams: Promise<{ to?: string; conversation?: string }> }) {
  const userId = await requireUserId();
  const m = await peBroadMembership(userId);
  if (!m) return <EmptyState title="Challenges are for PE@Broad members." />;
  const { to, conversation } = await searchParams;
  const members = await prisma.clubMember.findMany({
    where: { clubId: m.clubId, active: true, userId: { not: userId }, user: SOCIAL_USER_WHERE },
    select: { user: { select: { id: true, name: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader crumbs={[{ label: "Challenges", href: "/challenges" }, { label: "New" }]} title="New challenge" />
      <NewChallengeForm
        members={members.map((x) => x.user)}
        modules={modules().map((g) => ({ module: g.module, title: g.title, lessons: g.lessons.map((l) => ({ id: l.id, title: l.title })) }))}
        initialTo={to ?? ""}
        conversationId={conversation}
      />
    </div>
  );
}
