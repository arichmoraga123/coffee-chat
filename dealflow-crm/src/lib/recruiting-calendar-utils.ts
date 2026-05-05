import type { Prisma } from "@prisma/client";

export const RECRUITING_EVENT_TYPE_COLOR: Record<string, string> = {
  "Apps Open": "emerald",
  "Apps Close": "red",
  "Info Session": "blue",
  "First Round": "yellow",
  Superday: "orange",
  "Offer Deadline": "purple",
  "On-Cycle Start": "cyan",
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
