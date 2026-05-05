import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { matchCountdownEvents } from "@/lib/recruiting-calendar-utils";

const EVENT_BADGE: Record<string, string> = {
  "Apps Open": "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  "Apps Close": "bg-red-500/15 text-red-300 ring-red-500/30",
  "Info Session": "bg-blue-500/15 text-blue-300 ring-blue-500/30",
  "First Round": "bg-amber-500/15 text-amber-200 ring-amber-500/30",
  Superday: "bg-orange-500/15 text-orange-200 ring-orange-500/30",
  "Offer Deadline": "bg-violet-500/15 text-violet-200 ring-violet-500/30",
  "On-Cycle Start": "bg-cyan-500/15 text-cyan-200 ring-cyan-500/30",
  "Networking Event": "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
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
        <p className="text-sm text-zinc-500">
          No upcoming deadlines — add events on the{" "}
          <Link href="/recruiting-calendar" className="text-cyan-400 hover:underline">
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
                ? "text-red-400"
                : urgency === "yellow"
                  ? "text-amber-300"
                  : "text-emerald-400";
            return (
              <li
                key={ev.id}
                className="flex items-start justify-between gap-2 border-b border-white/5 pb-2 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-100">{ev.title}</p>
                  {ev.firmName ? <p className="truncate text-xs text-zinc-500">{ev.firmName}</p> : null}
                  <span
                    className={cn(
                      "mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ring-1",
                      EVENT_BADGE[ev.eventType] ?? "bg-zinc-500/15 text-zinc-300 ring-zinc-500/30",
                    )}
                  >
                    {ev.eventType}
                  </span>
                </div>
                <div className={cn("shrink-0 text-right tabular-nums", color)}>
                  <p className="text-2xl font-bold leading-none">{Math.max(0, days)}</p>
                  <p className="text-[10px] text-zinc-500">days</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Link
        href="/recruiting-calendar"
        className="mt-3 inline-block text-xs font-medium text-cyan-400 hover:underline"
      >
        View full calendar →
      </Link>
    </Card>
  );
}
