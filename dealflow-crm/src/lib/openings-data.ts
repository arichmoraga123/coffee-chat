import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { OFFICER_ROLES } from "@/lib/club-server";
import { normalizeFirmName } from "@/lib/contact-match";
import { easternToday, openingStatus, type OpeningStatus } from "@/lib/openings";

/** Who can upload and edit openings: site admins, and officers of a club (for that club's openings). */
export async function openingsAccess(userId: string) {
  const [user, memberships] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { role: true, classYear: true, careerTracks: true } }),
    prisma.clubMember.findMany({ where: { userId, active: true }, select: { clubId: true, role: true, club: { select: { name: true } } } }),
  ]);
  const isAdmin = user?.role === "ADMIN";
  const officerClubs = memberships.filter((m) => OFFICER_ROLES.has(m.role)).map((m) => ({ id: m.clubId, name: m.club.name }));
  const memberClubIds = memberships.map((m) => m.clubId);
  return { isAdmin, canEdit: isAdmin || officerClubs.length > 0, officerClubs, memberClubIds, memberClubs: memberships.map((m) => ({ id: m.clubId, name: m.club.name })), user };
}

/** May this user edit this opening? */
export async function canEditOpening(userId: string, clubId: string | null) {
  const a = await openingsAccess(userId);
  if (a.isAdmin) return true;
  return clubId !== null && a.officerClubs.some((c) => c.id === clubId);
}

export const visibleOpeningsWhere = (memberClubIds: string[], includeArchived = false): Prisma.OpeningWhereInput => ({
  OR: [{ clubId: null }, { clubId: { in: memberClubIds } }],
  ...(includeArchived ? {} : { archivedAt: null }),
});

export type OpeningRow = {
  id: string;
  clubId: string | null;
  firmName: string;
  program: string;
  roleType: string | null;
  track: string | null;
  group: string | null;
  classYears: string[];
  recruitingSummer: number | null;
  city: string;
  opensOn: string | null;
  deadline: string | null;
  deadlineType: string;
  statusOverride: string | null;
  status: OpeningStatus;
  link: string | null;
  source: string | null;
  notes: string | null;
  archived: boolean;
  /** The member's own firm with the same name (for the firm link and contacts). */
  myFirmId: string | null;
  knownContacts: number;
  pipeline: { id: string; stage: string } | null;
  reminder: { remindOpen: boolean; remindDaysBefore: number } | null;
};

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** Every opening this user can see, with their pipeline, reminder and contacts at that firm. */
export async function loadOpenings(userId: string, opts: { includeArchived?: boolean } = {}): Promise<OpeningRow[]> {
  const { memberClubIds } = await openingsAccess(userId);
  const [openings, firms, opps, reminders] = await Promise.all([
    prisma.opening.findMany({ where: visibleOpeningsWhere(memberClubIds, opts.includeArchived), orderBy: [{ deadline: "asc" }, { firmName: "asc" }], take: 3000 }),
    prisma.firm.findMany({ where: { userId }, select: { id: true, name: true, _count: { select: { contacts: { where: { deletedAt: null } } } } } }),
    prisma.opportunity.findMany({ where: { userId, openingId: { not: null } }, select: { id: true, stage: true, openingId: true } }),
    prisma.openingReminder.findMany({ where: { userId }, select: { openingId: true, remindOpen: true, remindDaysBefore: true } }),
  ]);
  const myFirms = new Map<string, { id: string; contacts: number }>();
  for (const f of firms) {
    const n = normalizeFirmName(f.name);
    const cur = myFirms.get(n);
    if (!cur || f._count.contacts > cur.contacts) myFirms.set(n, { id: f.id, contacts: f._count.contacts });
  }
  const oppBy = new Map(opps.map((o) => [o.openingId!, { id: o.id, stage: o.stage as string }]));
  const remBy = new Map(reminders.map((r) => [r.openingId, { remindOpen: r.remindOpen, remindDaysBefore: r.remindDaysBefore }]));
  const today = easternToday();
  return openings.map((o) => {
    const mine = myFirms.get(o.firmNorm) ?? null;
    return {
      id: o.id,
      clubId: o.clubId,
      firmName: o.firmName,
      program: o.program,
      roleType: o.roleType,
      track: o.track,
      group: o.group,
      classYears: o.classYears,
      recruitingSummer: o.recruitingSummer,
      city: o.city,
      opensOn: iso(o.opensOn),
      deadline: iso(o.deadline),
      deadlineType: o.deadlineType,
      statusOverride: o.statusOverride,
      status: openingStatus(o, today),
      link: o.link,
      source: o.source,
      notes: o.notes,
      archived: Boolean(o.archivedAt),
      myFirmId: mine?.id ?? null,
      knownContacts: mine?.contacts ?? 0,
      pipeline: oppBy.get(o.id) ?? null,
      reminder: remBy.get(o.id) ?? null,
    };
  });
}

/** Home "This week": deadlines in the next 7 days for openings the user saved (reminder) or added to their pipeline. */
export async function deadlinesThisWeek(userId: string) {
  const today = easternToday();
  const start = new Date(`${today}T00:00:00Z`);
  const end = new Date(start.getTime() + 7 * 86_400_000);
  const rows = await prisma.opening.findMany({
    where: {
      archivedAt: null,
      deadline: { gte: start, lte: end },
      OR: [{ reminders: { some: { userId } } }, { opportunities: { some: { userId } } }],
    },
    orderBy: { deadline: "asc" },
    take: 10,
    select: { id: true, firmName: true, program: true, deadline: true },
  });
  return rows.map((r) => ({ id: r.id, firm: r.firmName, program: r.program, deadline: iso(r.deadline)! }));
}
