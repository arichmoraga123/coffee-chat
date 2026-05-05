"use client";

import Link from "next/link";
import { addDays } from "date-fns";
import { Card } from "@/components/ui/card";

export type RecruitingSidebarEvent = {
  id: string;
  title: string;
  firmName: string | null;
  eventType: string;
  date: string;
};

export function RecruitingCalendarSidebar({ events }: { events: RecruitingSidebarEvent[] }) {
  const now = new Date();
  const horizon = addDays(now, 30);
  const upcoming = events.filter((e) => {
    const d = new Date(e.date);
    return d >= now && d <= horizon;
  });

  return (
    <Card className="p-3 text-xs">
      <p className="section-label mb-2">Recruiting season (30 days)</p>
      <p className="mb-2 text-[10px] leading-snug text-zinc-500">
        Crowdsourced dates —{" "}
        <Link href="/recruiting-calendar" className="text-[#f0f0f0] underline-offset-4 hover:underline">
          verify on firm sites
        </Link>
        .
      </p>
      <div className="max-h-[320px] space-y-2 overflow-y-auto">
        {upcoming.length === 0 ? (
          <p className="text-zinc-500">No shared recruiting events in the next 30 days.</p>
        ) : (
          upcoming.map((e) => (
            <div key={e.id} className="rounded border border-white/10 bg-black/20 px-2 py-1.5">
              <p className="font-medium text-zinc-100">{e.title}</p>
              <p className="text-[10px] text-zinc-500">
                {e.firmName ?? "—"} · {e.eventType}
              </p>
              <p className="text-[10px] text-zinc-600">
                {new Date(e.date).toLocaleDateString(undefined, { dateStyle: "medium" })}
              </p>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
