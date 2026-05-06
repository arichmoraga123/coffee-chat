import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { isClubOfficer, resolveClubIdForUser } from "@/lib/club-server";
import { Card } from "@/components/ui/card";
import { ClubAnnouncementComposer } from "@/components/club-announcement-composer";
import { ClubMarkReadAnnouncementButton } from "@/components/club-mark-read-button";

export const dynamic = "force-dynamic";

export default async function ClubAnnouncementsPage() {
  const userId = await requireUserId();
  const clubId = await resolveClubIdForUser(userId);
  if (!clubId) {
    return <p className="text-sm text-zinc-400">No club context.</p>;
  }

  const [rows, officer] = await Promise.all([
    prisma.clubAnnouncement.findMany({
      where: { clubId },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      include: { author: { select: { name: true } } },
    }),
    isClubOfficer(userId, clubId),
  ]);

  const pinned = rows.filter((r) => r.isPinned);
  const rest = rows.filter((r) => !r.isPinned);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-50">Announcements</h1>
      {officer ? <ClubAnnouncementComposer clubId={clubId} /> : null}

      <div className="space-y-4">
        {[...pinned, ...rest].map((a) => {
          const read = a.readBy.includes(userId);
          return (
            <Card key={a.id} className="border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {a.isPinned ? (
                    <span className="mb-1 inline-block rounded bg-amber-950/80 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-200">
                      Pinned
                    </span>
                  ) : null}
                  <h2 className="text-lg font-medium text-zinc-100">{a.title}</h2>
                  <p className="text-xs text-zinc-500">
                    {a.author.name} · {format(a.createdAt, "MMM d, yyyy")}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">{a.body}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <ClubMarkReadAnnouncementButton id={a.id} read={read} />
                  {officer ? (
                    <span className="text-[10px] text-zinc-500">{a.readBy.length} read</span>
                  ) : null}
                </div>
              </div>
            </Card>
          );
        })}
        {rows.length === 0 ? <p className="text-sm text-zinc-500">No announcements yet.</p> : null}
      </div>
    </div>
  );
}
