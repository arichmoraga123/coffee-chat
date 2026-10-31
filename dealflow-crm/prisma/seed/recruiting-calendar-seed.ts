import type { Prisma } from "@prisma/client";
import { PROGRAMS_2028, type ProgramBucket } from "../../src/lib/recruiting-programs-2028";

const VERTICAL: Record<ProgramBucket, string> = {
  "Bulge Bracket": "IB",
  "Elite Boutique": "IB",
  "Middle Market": "IB",
  "Buy-Side": "PE",
};

function noonUtc(iso: string) {
  return new Date(`${iso}T12:00:00.000Z`);
}

/** Apps Open / Apps Close events for every Summer 2028 program with published dates. */
export const SEED_RECRUITING_CALENDAR: Prisma.RecruitingCalendarEventCreateManyInput[] = PROGRAMS_2028.flatMap((p) => {
  const base = {
    firmName: p.company,
    vertical: VERTICAL[p.bucket],
    verified: true,
    notes: [p.program, p.locations, p.notes].filter(Boolean).join(" · ") || null,
  };
  const out: Prisma.RecruitingCalendarEventCreateManyInput[] = [];
  if (p.opens) {
    const date = noonUtc(p.opens);
    out.push({
      ...base,
      title: `${p.company} — ${p.program} opens`,
      eventType: "Apps Open",
      date,
      year: date.getUTCFullYear(),
      dedupeKey: `prog2028-open-${p.id}`,
    });
  }
  if (p.closes) {
    const date = noonUtc(p.closes);
    out.push({
      ...base,
      title: `${p.company} — ${p.program} deadline`,
      eventType: "Apps Close",
      date,
      year: date.getUTCFullYear(),
      dedupeKey: `prog2028-close-${p.id}`,
    });
  }
  return out;
});

/** Old approximate placeholder events (pre-2028 tracker) — removed on seed. */
export const STALE_CALENDAR_DEDUPE_PREFIX = "seed-2026-";
