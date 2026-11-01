import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { matchCountdownEvents } from "@/lib/recruiting-calendar-utils";

/** Muted badges — meaning from label text, not loud fills */
const EVENT_BADGE: Record<string, string> = {
  "Apps Open": "border-border bg-surface text-ink-3",
  "Apps Close": "border-border-strong bg-surface text-accent",
  "Info Session": "border-border bg-surface text-ink-3",
  "First Round": "border-border bg-surface text-ink-3",
  Superday: "border-border bg-surface text-ink-3",
  "Offer Deadline": "border-border bg-surface text-ink-3",
  "On-Cycle Start": "border-border bg-surface text-ink-3",
  "Networking Event": "border-border bg-surface text-ink-3",
};

export async function DashboardRecruitingCountdown({
  userId: _userId,
  targets,
}: {
  userId: string;
  targets: string[];
}) {
  const events = await prisma.recruitingCalendarEvent.findMany({
    where: matchCountdownEvents(targets),
    orderBy: { date: "asc" },
    take: 3,
  });

  const now = new Date();

  return (
    <Card className="p-3">
      <p className="section-label mb-3">Countdown</p>
      {events.length === 0 ? (
        <p className="text-sm text-ink-3">
          No upcoming deadlines — add events on the{" "}
          <Link href="/recruiting-calendar" className="text-ink underline-offset-4 hover:underline">
            Recruiting Calendar
          </Link>
          .
        </p>
      ) : (
        <ul className="space-y-3">
          {events.map((ev) => {
            const days = differenceInCalendarDays(ev.date, now);
            const urgency = days < 7 ? "red" : days <= 30 ? "yellow" : "green";
            const color =
              urgency === "red"
                ? "text-accent"
                : urgency === "yellow"
                  ? "text-accent"
                  : "text-ink-3";
            return (
              <li
                key={ev.id}
                className="flex items-start justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{ev.title}</p>
                  {ev.firmName ? <p className="truncate text-xs text-ink-3">{ev.firmName}</p> : null}
                  <span
                    className={cn(
                      "mt-1 inline-block rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
                      EVENT_BADGE[ev.eventType] ?? "border-border bg-surface text-ink-3",
                    )}
                  >
                    {ev.eventType}
                  </span>
                </div>
                <div className={cn("shrink-0 text-right tabular-nums", color)}>
                  <p className="text-2xl font-bold leading-none">{Math.max(0, days)}</p>
                  <p className="text-[10px] text-ink-3">days</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Link
        href="/recruiting-calendar"
        className="mt-3 inline-block text-xs font-medium text-ink underline-offset-4 hover:underline"
      >
        View full calendar →
      </Link>
    </Card>
  );
}
