import type { Prisma } from "@prisma/client";

export const RECRUITING_EVENT_TYPE_COLOR: Record<string, string> = {
  "Apps Open": "emerald",
  "Apps Close": "red",
  "Info Session": "blue",
  "First Round": "yellow",
  Superday: "orange",
  "Offer Deadline": "purple",
  "On-Cycle Start": "blue",
  "Networking Event": "zinc",
};

export function buildRecruitingCalendarWhere(opts: {
  year?: number;
  vertical?: string;
  from?: Date;
  to?: Date;
}): Prisma.RecruitingCalendarEventWhereInput {
  const and: Prisma.RecruitingCalendarEventWhereInput[] = [];
  if (opts.year != null) and.push({ year: opts.year });
  if (opts.vertical && opts.vertical !== "all") {
    and.push({ vertical: opts.vertical });
  }
  if (opts.from) and.push({ date: { gte: opts.from } });
  if (opts.to) and.push({ date: { lte: opts.to } });
  if (and.length === 0) return {};
  return { AND: and };
}

export function matchCountdownEvents(
  targets: string[],
): Prisma.RecruitingCalendarEventWhereInput {
  const from = new Date();
  if (!targets.length) {
    return { date: { gte: from } };
  }
  return {
    date: { gte: from },
    OR: [{ vertical: null }, { vertical: { in: targets } }],
  };
}

/** Map profile career tracks (full names) + legacy recruitingTarget (IB/PE/…) to calendar `vertical` values. */
export function calendarVerticalsFromProfile(
  careerTracks: string[],
  recruitingTarget: string[],
): string[] {
  const trackToVertical: Record<string, string[]> = {
    "Investment Banking": ["IB"],
    "Private Equity": ["PE"],
    "Venture Capital": ["VC"],
    Consulting: ["Consulting"],
    "Corporate Finance": ["IB"],
    "Capital Markets": ["IB"],
    "Sales & Trading": ["IB"],
    "Asset Management": ["PE"],
    "Equity Research": ["IB"],
    "Hedge Fund": ["PE"],
    "Private Credit": ["PE"],
    "Real Estate": ["PE"],
    "Big 4 Accounting": ["Consulting"],
    "Wealth Management": ["PE"],
    "Tech/Startup": ["VC"],
    Actuarial: ["PE"],
  };
  const out = new Set<string>();
  for (const t of recruitingTarget) {
    if (t === "IB") out.add("IB");
    else if (t === "PE") out.add("PE");
    else if (t === "VC") out.add("VC");
    else if (t === "Consulting") out.add("Consulting");
  }
  for (const tr of careerTracks) {
    for (const v of trackToVertical[tr] ?? []) out.add(v);
  }
  return Array.from(out);
}
