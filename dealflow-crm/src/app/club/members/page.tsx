import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { isClubOfficer, resolveClubIdForUser } from "@/lib/club-server";
import { ClubMembersFilter } from "@/components/club-members-filter";

export const dynamic = "force-dynamic";

export default async function ClubMembersPage() {
  const userId = await requireUserId();
  const clubId = await resolveClubIdForUser(userId);
  if (!clubId) return <p className="text-sm text-zinc-400">No club context.</p>;

  const [rows, officer] = await Promise.all([
    prisma.clubMember.findMany({
      where: { clubId },
      orderBy: { joinedAt: "asc" },
      include: { user: { select: { id: true, name: true, email: true, careerTracks: true } } },
    }),
    isClubOfficer(userId, clubId),
  ]);

  const members = rows.map((r) => ({
    id: r.id,
    role: r.role,
    name: r.user.name,
    email: officer ? r.user.email : undefined,
    careerTracks: r.user.careerTracks,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-zinc-50">Members</h1>
      {!officer ? (
        <p className="text-xs text-zinc-500">Officers can see full contact details. Your view shows names and tracks only.</p>
      ) : (
        <p className="text-xs text-zinc-500">Officer view: emails visible.</p>
      )}
      <ClubMembersFilter members={members} />
    </div>
  );
}
