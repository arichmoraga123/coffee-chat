import { notFound } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GroupArena } from "@/components/groups/group-arena";
import { GroupDetailView } from "@/components/group-detail-view";
import { duelsForGroup, leagueTable, teamContributions } from "@/lib/group-competition";

export const dynamic = "force-dynamic";

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const group = await prisma.studyGroup.findUnique({ where: { id }, select: { id: true, name: true, description: true, visibility: true, joinCode: true, _count: { select: { members: true } } } });
  if (!group) notFound();
  const [member, me, league, contributions, duels] = await Promise.all([
    prisma.studyGroupMember.findUnique({ where: { groupId_userId: { groupId: id, userId } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { teamGroupId: true } }),
    leagueTable(),
    teamContributions(id),
    duelsForGroup(id),
  ]);
  // Invite-only groups are visible to members only; open groups show their scoreboard to everyone.
  if (!member && group.visibility !== "open") notFound();
  const members = member
    ? await prisma.studyGroupMember.findMany({ where: { groupId: id }, select: { role: true, user: { select: { id: true, name: true, teamGroupId: true } } } })
    : [];
  return (
    <div className="space-y-6">
      <GroupArena
        group={{ id: group.id, name: group.name, description: group.description, visibility: group.visibility, joinCode: member ? group.joinCode : null, members: group._count.members }}
        viewer={{ isMember: Boolean(member), isCaptain: member?.role === "admin", isTeam: me?.teamGroupId === id, hasTeam: Boolean(me?.teamGroupId) }}
        row={league.find((r) => r.id === id) ?? null}
        opponents={league.filter((r) => r.id !== id).map((r) => ({ id: r.id, name: r.name, rank: r.rank, teamSize: r.teamSize }))}
        contributions={contributions}
        duels={duels}
        roster={members.map((m) => ({ id: m.user.id, name: m.user.name, captain: m.role === "admin", onTeam: m.user.teamGroupId === id }))}
      />
      {member ? <GroupDetailView groupId={id} /> : null}
    </div>
  );
}
