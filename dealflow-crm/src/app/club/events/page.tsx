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
  if (!clubId) return <p className="text-sm text-ink-2">No club context.</p>;

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
      <h1 className="text-xl font-semibold text-ink">Events</h1>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-3">Upcoming</h2>
        <div className="space-y-3">
          {upcoming.map((e) => (
            <Card key={e.id} className="border-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase text-ink-3">{e.type}</p>
                  <h3 className="text-base font-medium text-ink">{e.title}</h3>
                  <p className="text-sm text-ink-2">{format(e.date, "EEEE, MMM d · h:mm a")}</p>
                  {e.location ? <p className="text-xs text-ink-3">{e.location}</p> : null}
                  {e.materialsLink ? (
                    <a href={e.materialsLink} className="mt-1 inline-block text-xs text-warn hover:underline" target="_blank" rel="noreferrer">
                      Materials
                    </a>
                  ) : null}
                </div>
                <ClubRsvpButton eventId={e.id} going={e.rsvpIds.includes(userId)} />
              </div>
            </Card>
          ))}
          {upcoming.length === 0 ? <p className="text-sm text-ink-3">No upcoming events.</p> : null}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-3">Past</h2>
        <div className="space-y-2">
          {past.map((e) => (
            <Card key={e.id} className="border-border bg-surface p-3">
              <p className="text-sm font-medium text-ink">{e.title}</p>
              <p className="text-xs text-ink-3">{format(e.date, "MMM d, yyyy")}</p>
              {e.materialsLink ? (
                <a href={e.materialsLink} className="text-xs text-warn hover:underline" target="_blank" rel="noreferrer">
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
