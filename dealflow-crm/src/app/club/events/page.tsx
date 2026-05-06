import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { resolveClubIdForUser } from "@/lib/club-server";
import { Card } from "@/components/ui/card";
import { ClubRsvpButton } from "@/components/club-rsvp-button";

export const dynamic = "force-dynamic";

export default async function ClubEventsPage() {
  const userId = await requireUserId();
  const clubId = await resolveClubIdForUser(userId);
  if (!clubId) return <p className="text-sm text-zinc-400">No club context.</p>;

  const now = new Date();
  const [upcoming, past] = await Promise.all([
    prisma.clubEvent.findMany({
      where: { clubId, date: { gte: now } },
      orderBy: { date: "asc" },
    }),
    prisma.clubEvent.findMany({
      where: { clubId, date: { lt: now } },
      orderBy: { date: "desc" },
      take: 12,
    }),
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold text-zinc-50">Events</h1>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Upcoming</h2>
        <div className="space-y-3">
          {upcoming.map((e) => (
            <Card key={e.id} className="border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase text-zinc-500">{e.type}</p>
                  <h3 className="text-base font-medium text-zinc-100">{e.title}</h3>
                  <p className="text-sm text-zinc-400">{format(e.date, "EEEE, MMM d · h:mm a")}</p>
                  {e.location ? <p className="text-xs text-zinc-500">{e.location}</p> : null}
                  {e.materialsLink ? (
                    <a href={e.materialsLink} className="mt-1 inline-block text-xs text-amber-200/90 hover:underline" target="_blank" rel="noreferrer">
                      Materials
                    </a>
                  ) : null}
                </div>
                <ClubRsvpButton eventId={e.id} going={e.rsvpIds.includes(userId)} />
              </div>
            </Card>
          ))}
          {upcoming.length === 0 ? <p className="text-sm text-zinc-500">No upcoming events.</p> : null}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">Past</h2>
        <div className="space-y-2">
          {past.map((e) => (
            <Card key={e.id} className="border-zinc-800 bg-zinc-950/80 p-3">
              <p className="text-sm font-medium text-zinc-200">{e.title}</p>
              <p className="text-xs text-zinc-500">{format(e.date, "MMM d, yyyy")}</p>
              {e.materialsLink ? (
                <a href={e.materialsLink} className="text-xs text-amber-200/80 hover:underline" target="_blank" rel="noreferrer">
                  Materials
                </a>
              ) : null}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
