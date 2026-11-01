"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProgramTracker } from "@/components/program-tracker";
import { RecruitingSeasonCalendarView } from "@/components/recruiting-season-calendar-view";

export function RecruitingCalendarTabs() {
  const [tab, setTab] = useState<"programs" | "calendar">("programs");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Recruiting tracker</h1>
        <p className="mt-1 text-sm text-ink-3">
          Every Summer 2028 program with open/close dates, plus a month calendar of key recruiting events.
        </p>
      </div>
      <div className="flex gap-2 border-b border-border pb-3">
        <Button size="sm" variant={tab === "programs" ? "default" : "outline"} onClick={() => setTab("programs")}>
          2028 programs
        </Button>
        <Button size="sm" variant={tab === "calendar" ? "default" : "outline"} onClick={() => setTab("calendar")}>
          Events calendar
        </Button>
      </div>
      {tab === "programs" ? <ProgramTracker /> : <RecruitingSeasonCalendarView />}
    </div>
  );
}
