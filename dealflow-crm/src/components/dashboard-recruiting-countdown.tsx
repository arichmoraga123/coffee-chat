import Link from "next/link";
import { differenceInCalendarDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { matchCountdownEvents } from "@/lib/recruiting-calendar-utils";

/** Muted badges — meaning from label text, not loud fills */
const EVENT_BADGE: Record<string, string> = {
  "Apps Open": "border-[#2a2a2a] bg-[#161616] text-[#888888]",
  "Apps Close": "border-[#3a3a3a] bg-[#161616] text-[#c9a84c]",
  "Info Session": "border-[#2a2a2a] bg-[#161616] text-[#888888]",
  "First Round": "border-[#2a2a2a] bg-[#161616] text-[#888888]",
  Superday: "border-[#2a2a2a] bg-[#161616] text-[#888888]",
  "Offer Deadline": "border-[#2a2a2a] bg-[#161616] text-[#888888]",
  "On-Cycle Start": "border-[#2a2a2a] bg-[#161616] text-[#888888]",
  "Networking Event": "border-[#2a2a2a] bg-[#161616] text-[#888888]",
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
        <p className="text-sm text-[#888888]">
          No upcoming deadlines — add events on the{" "}
          <Link href="/recruiting-calendar" className="text-[#f5f5f5] underline-offset-4 hover:underline">
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
                ? "text-[#c9a84c]"
                : urgency === "yellow"
                  ? "text-[#c9a84c]/80"
                  : "text-[#888888]";
            return (
              <li
                key={ev.id}
                className="flex items-start justify-between gap-2 border-b border-[#2a2a2a] pb-2 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#f0f0f0]">{ev.title}</p>
                  {ev.firmName ? <p className="truncate text-xs text-[#888888]">{ev.firmName}</p> : null}
                  <span
                    className={cn(
                      "mt-1 inline-block rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
                      EVENT_BADGE[ev.eventType] ?? "border-[#2a2a2a] bg-[#161616] text-[#888888]",
                    )}
                  >
                    {ev.eventType}
                  </span>
                </div>
                <div className={cn("shrink-0 text-right tabular-nums", color)}>
                  <p className="text-2xl font-bold leading-none">{Math.max(0, days)}</p>
                  <p className="text-[10px] text-[#888888]">days</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Link
        href="/recruiting-calendar"
        className="mt-3 inline-block text-xs font-medium text-[#f5f5f5] underline-offset-4 hover:underline"
      >
        View full calendar →
      </Link>
    </Card>
  );
}
