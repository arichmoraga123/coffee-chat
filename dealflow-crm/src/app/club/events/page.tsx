import { CalendarPlus, MapPin, Video } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { clubViewer, eventInput, fmtEt, lessonOptions } from "@/lib/club-view";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SimpleMarkdown } from "@/components/ui/simple-markdown";
import { RsvpButtons } from "@/components/club/rsvp-buttons";
import { ItemAdminMenu } from "@/components/club/item-admin-menu";
import { PostToClubButton } from "@/components/club/publish-dialog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Club events" };

export default async function ClubEventsPage() {
  const userId = await requireUserId();
  const v = await clubViewer(userId);
  if (!v) return <p className="text-sm text-ink-2">No club context.</p>;
  const now = new Date();
  const recent = new Date(now.getTime() - 3 * 3_600_000);
  const [upcoming, past] = await Promise.all([
    prisma.clubEvent.findMany({ where: { clubId: v.clubId, date: { gte: recent }, ...(v.canPost ? {} : { archivedAt: null }) }, orderBy: { date: "asc" } }),
    prisma.clubEvent.findMany({ where: { clubId: v.clubId, date: { lt: recent }, archivedAt: null }, orderBy: { date: "desc" }, take: 12 }),
  ]);
  const ids = [...new Set(upcoming.flatMap((e) => [...e.rsvpIds, ...e.declinedIds]))];
  const names = v.canPost ? new Map((await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })).map((u) => [u.id, u.name])) : new Map<string, string>();
  const lessons = v.canPost ? lessonOptions() : [];

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="section-title">Upcoming</h2>
        {upcoming.length === 0 ? (
          <EmptyState
            title="No upcoming events"
            description={v.canPost ? "Add a meeting, info session or prep night. Members can RSVP and add it to their calendar." : "Check back soon."}
            action={v.canPost ? <PostToClubButton isAdmin={v.isAdmin} lessons={lessons} label="Add event" type="event" variant="secondary" /> : undefined}
          />
        ) : (
          upcoming.map((e) => {
            const status = e.rsvpIds.includes(userId) ? "going" : e.declinedIds.includes(userId) ? "declined" : "none";
            const when = fmtEt(e.date, { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
            const end = e.endDate ? fmtEt(e.endDate, { hour: "numeric", minute: "2-digit" }) : null;
            return (
              <Card key={e.id} id={e.id} className={`scroll-mt-6 p-5 ${e.archivedAt ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <h3 className="text-base font-semibold text-ink">{e.title}</h3>
                    <p className="text-sm text-ink-2">
                      {when}
                      {end ? ` – ${end}` : ""} ET{e.archivedAt ? " · Archived" : ""}
                    </p>
                    {e.location ? (
                      <p className="flex items-center gap-1 text-[13px] text-ink-3">
                        <MapPin className="size-3.5" aria-hidden /> {e.location}
                      </p>
                    ) : null}
                    {e.meetingLink ? (
                      <a href={e.meetingLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[13px] text-accent hover:underline">
                        <Video className="size-3.5" aria-hidden /> Join link
                      </a>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {e.rsvpOn ? <RsvpButtons eventId={e.id} initial={status} going={e.rsvpIds.length} declined={e.declinedIds.length} full={Boolean(e.capacity && e.rsvpIds.length >= e.capacity)} /> : null}
                    <a href={`/api/club/events/${e.id}/ics`} className="flex h-8 items-center gap-1 rounded-[var(--radius)] px-2 text-[13px] font-medium text-accent hover:bg-accent-tint">
                      <CalendarPlus className="size-4" aria-hidden /> Add to calendar
                    </a>
                  </div>
                </div>
                {e.description ? <SimpleMarkdown text={e.description} className="mt-3 text-sm text-ink-2" /> : null}
                {e.capacity ? <p className="mt-2 text-xs text-ink-3">{Math.max(0, e.capacity - e.rsvpIds.length)} of {e.capacity} spots left</p> : null}
                {v.canPost ? (
                  <div className="mt-3 flex flex-wrap items-start justify-between gap-2 border-t border-divider pt-3">
                    <p className="text-[13px] text-ink-3">
                      <span className="font-medium text-ink-2">Going:</span> {e.rsvpIds.map((u) => names.get(u) ?? "Member").join(", ") || "nobody yet"}
                      {e.declinedIds.length ? (
                        <>
                          <br />
                          <span className="font-medium text-ink-2">Can&apos;t make it:</span> {e.declinedIds.map((u) => names.get(u) ?? "Member").join(", ")}
                        </>
                      ) : null}
                    </p>
                    <ItemAdminMenu target={{ kind: "event", id: e.id, input: eventInput(e) }} isAdmin={v.isAdmin} lessons={lessons} archived={Boolean(e.archivedAt)} />
                  </div>
                ) : null}
              </Card>
            );
          })
        )}
      </section>

      {past.length ? (
        <section className="space-y-2">
          <h2 className="section-title">Past</h2>
          <ul className="divide-y divide-divider rounded-[var(--radius-lg)] border border-border bg-surface">
            {past.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                <span className="font-medium text-ink">{e.title}</span>
                <span className="text-[13px] text-ink-3">
                  {fmtEt(e.date, { month: "short", day: "numeric", year: "numeric" })} · {e.rsvpIds.length} went
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
