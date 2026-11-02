import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeFirmName } from "@/lib/contact-match";
import { getGroupFinderData } from "@/lib/fit-content";
import { groupSearchTerm } from "@/lib/groupFinder";
import { levelFromGradYear } from "@/lib/resume/rubric";

export type ContextInteraction = { id: string; date: string; contact: string; firm: string; firstLine: string };
export type FitContextResult = {
  interactions: ContextInteraction[];
  /** Why this city: the profile hometown and contacts in that city. */
  hometown?: string | null;
  cityContacts?: { id: string; name: string; firm: string; location: string }[];
  /** Why this group: the latest Group Finder result. */
  groupFinder?: { date: string; top: { id: string; name: string; match: number }[] } | null;
};

const firstLine = (...xs: (string | null | undefined)[]) => (xs.find((x) => x && x.trim()) ?? "").trim().split(/\n/)[0].slice(0, 200);

async function interactionsWhere(userId: string, contact: Prisma.ContactWhereInput, take = 20): Promise<ContextInteraction[]> {
  const rows = await prisma.interaction.findMany({
    where: { userId, deletedAt: null, contact: { ...contact, deletedAt: null } },
    orderBy: { date: "desc" },
    take,
    select: { id: true, date: true, notes: true, adviceGiven: true, personalDetails: true, contact: { select: { fullName: true, firm: { select: { name: true } } } } },
  });
  return rows.map((r) => ({
    id: r.id,
    date: r.date.toISOString().slice(0, 10),
    contact: r.contact.fullName,
    firm: r.contact.firm.name,
    firstLine: firstLine(r.notes, r.adviceGiven, r.personalDetails),
  }));
}

/** Pre-fill data for a fit answer about a firm, city or group, pulled from the student's rolodex and profile. */
export async function fitContext(userId: string, kind: string, value: string): Promise<FitContextResult> {
  const v = value.trim();
  if (kind === "firm" && v) {
    const norm = normalizeFirmName(v);
    const firms = (await prisma.firm.findMany({ where: { userId }, select: { id: true, name: true } })).filter((f) => normalizeFirmName(f.name) === norm);
    if (!firms.length) return { interactions: [] };
    return { interactions: await interactionsWhere(userId, { firmId: { in: firms.map((f) => f.id) } }) };
  }
  if (kind === "city") {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { hometown: true } });
    const city = v.split(",")[0].trim();
    const contacts = city
      ? await prisma.contact.findMany({
          where: { userId, deletedAt: null, location: { contains: city, mode: "insensitive" } },
          take: 20,
          select: { id: true, fullName: true, location: true, firm: { select: { name: true } } },
        })
      : [];
    return {
      hometown: user?.hometown ?? null,
      cityContacts: contacts.map((c) => ({ id: c.id, name: c.fullName, firm: c.firm.name, location: c.location })),
      interactions: contacts.length ? await interactionsWhere(userId, { id: { in: contacts.map((c) => c.id) } }) : [],
    };
  }
  if (kind === "group") {
    const [latest, data] = await Promise.all([prisma.groupFinderResult.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }), getGroupFinderData()]);
    const profile = data.groups.find((g) => g.name === v || g.id === v);
    const term = profile ? groupSearchTerm(profile) : v;
    const top = latest ? ((latest.results as { id: string; name: string; match: number }[]) ?? []).slice(0, 3) : [];
    return {
      groupFinder: latest ? { date: latest.createdAt.toISOString().slice(0, 10), top: top.map((t) => ({ id: t.id, name: t.name, match: t.match })) } : null,
      interactions: term ? await interactionsWhere(userId, { group: { contains: term, mode: "insensitive" } }) : [],
    };
  }
  return { interactions: [] };
}

/** Choices for the firm / city / group picker on placeholder questions. */
export async function variantChoices(userId: string) {
  const [user, firms, opps, cities, data] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { targetFirms: true, hometown: true } }),
    prisma.firm.findMany({ where: { userId }, select: { name: true }, orderBy: { name: "asc" }, take: 500 }),
    prisma.opportunity.findMany({ where: { userId }, select: { firm: { select: { name: true } }, location: true } }),
    prisma.contact.findMany({ where: { userId, deletedAt: null, location: { not: "" } }, select: { location: true }, distinct: ["location"], take: 200 }),
    getGroupFinderData(),
  ]);
  const uniq = (xs: (string | null | undefined)[]) => [...new Set(xs.map((x) => (x ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  return {
    firm: uniq([...(user?.targetFirms ?? []), ...opps.map((o) => o.firm.name), ...firms.map((f) => f.name)]),
    city: uniq([...data.groups.flatMap((g) => g.hubs), ...cities.map((c) => c.location.split(",")[0]), ...opps.map((o) => o.location), user?.hometown]),
    group: data.groups.map((g) => g.name),
  };
}

/** Profile values the draft template can use. */
export async function draftBasics(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { classYear: true, hometown: true, school: { select: { name: true, shortName: true } } } });
  const level = levelFromGradYear(u?.classYear);
  return { year: level ? level.toLowerCase() : null, level: level ?? "Sophomore", school: u?.school?.name ?? null, hometown: u?.hometown ?? null };
}
