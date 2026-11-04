import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GroupsHub } from "@/components/groups/groups-hub";
import { leagueTable, pointsFor } from "@/lib/group-competition";
import { weekStartET } from "@/lib/group-points-rules";

export const dynamic = "force-dynamic";
export const metadata = { title: "Study groups" };

export default async function GroupsPage({ searchParams }: { searchParams: Promise<{ join?: string }> }) {
  const userId = await requireUserId();
  const sp = await searchParams;
  const [league, memberships, me] = await Promise.all([
    leagueTable(),
    prisma.studyGroupMember.findMany({ where: { userId }, include: { group: { select: { id: true, name: true, description: true, _count: { select: { members: true } } } } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { teamGroupId: true, teamJoinedAt: true } }),
  ]);
  const mine = new Set(memberships.map((m) => m.groupId));
  const open = await prisma.studyGroup.findMany({
    where: { visibility: "open", id: { notIn: [...mine] } },
    select: { id: true, name: true, description: true, _count: { select: { members: true } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const myPoints = me?.teamGroupId
    ? (await pointsFor([userId], weekStartET(), new Date(), new Map([[userId, me.teamJoinedAt]]))).get(userId) ?? null
    : null;
  return (
    <GroupsHub
      league={league}
      teamId={me?.teamGroupId ?? null}
      myPoints={myPoints}
      groups={memberships.map((m) => ({ id: m.group.id, name: m.group.name, description: m.group.description, role: m.role, members: m.group._count.members }))}
      open={open.map((g) => ({ id: g.id, name: g.name, description: g.description, members: g._count.members, row: league.find((r) => r.id === g.id) ?? null }))}
      joinCode={(sp.join ?? "").slice(0, 20)}
    />
  );
}
