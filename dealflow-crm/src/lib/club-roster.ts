import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";

export const PE_BROAD_NAME = "PE@Broad";
export const ROSTER_ROLES = ["member", "admin"] as const;
export type RosterRole = (typeof ROSTER_ROLES)[number];

export type RosterRow = { email: string; name: string | null; role: RosterRole };

/** Finds (or creates) the MSU school and the PE@Broad club. */
export async function getPeBroadClub(db: PrismaClient = defaultPrisma) {
  const school = await db.school.upsert({
    where: { domain: "msu.edu" },
    create: { name: "Michigan State University", shortName: "MSU", domain: "msu.edu", location: "East Lansing, MI", isVerified: true },
    update: {},
    select: { id: true },
  });
  return db.club.upsert({
    where: { schoolId_name: { schoolId: school.id, name: PE_BROAD_NAME } },
    create: { schoolId: school.id, name: PE_BROAD_NAME, type: "PE", isVerified: true, isPublic: true },
    update: {},
    select: { id: true, name: true },
  });
}

/* ───────────── parsing ───────────── */

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

/** "Tuvell, Boston" → "Boston Tuvell"; anything else is trimmed as-is. */
export function normalizeName(raw: string | null | undefined): string | null {
  const s = (raw ?? "").replace(/["']/g, "").replace(/\s+/g, " ").trim();
  if (!s) return null;
  const m = /^([^,]+),\s*(.+)$/.exec(s);
  return m ? `${m[2].trim()} ${m[1].trim()}` : s;
}

/**
 * Outlook attendee text, e.g. `Tuvell, Boston <tuvellbo@msu.edu>  Required  Accepted`, one or many per line
 * (also separated by `;`). Every `<email>` is extracted, with the name in front of it.
 */
export function parseOutlookPaste(text: string): RosterRow[] {
  const out = new Map<string, RosterRow>();
  const re = /([^<>;\n]*?)<\s*([^<>\s]+@[^<>\s]+)\s*>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const email = m[2].trim().toLowerCase();
    if (!EMAIL_RE.test(email)) continue;
    const name = normalizeName(m[1].replace(/\b(Required|Optional|Accepted|Tentative|Declined|None)\b/gi, ""));
    if (!out.has(email)) out.set(email, { email, name, role: "member" });
  }
  // Bare emails without angle brackets.
  for (const token of text.split(/[\s,;]+/)) {
    const e = token.replace(/[<>]/g, "").toLowerCase();
    if (EMAIL_RE.test(e) && EMAIL_RE.exec(e)?.[0] === e && !out.has(e)) out.set(e, { email: e, name: null, role: "member" });
  }
  return [...out.values()];
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      cells.push(cur);
      cur = "";
    } else cur += c;
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

/** CSV with header `email,name,role` (same format as pebroad-roster.csv). */
export function parseRosterCsv(text: string): { rows: RosterRow[]; errors: string[] } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  const errors: string[] = [];
  if (!lines.length) return { rows: [], errors: ["File is empty"] };
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const ei = header.indexOf("email");
  if (ei < 0) return { rows: [], errors: ['Missing "email" column'] };
  const ni = header.indexOf("name");
  const ri = header.indexOf("role");
  const rows = new Map<string, RosterRow>();
  lines.slice(1).forEach((line, i) => {
    const cells = splitCsvLine(line);
    const email = (cells[ei] ?? "").toLowerCase();
    if (!EMAIL_RE.test(email)) {
      errors.push(`Line ${i + 2}: "${cells[ei] ?? ""}" isn't an email`);
      return;
    }
    const roleRaw = ri >= 0 ? (cells[ri] ?? "").toLowerCase() : "member";
    const role: RosterRole = roleRaw === "admin" ? "admin" : "member";
    rows.set(email, { email, name: ni >= 0 ? normalizeName(cells[ni]) : null, role });
  });
  return { rows: [...rows.values()], errors };
}

/* ───────────── syncing ───────────── */

/** Roster role → ClubMember role. Roster admins become club officers. */
export const clubRoleFor = (rosterRole: string) => (rosterRole === "admin" ? "admin" : "member");

/**
 * Matches one user against the roster by login email AND verified .edu email (lowercased).
 * Active match → active membership with the roster role. Only-deactivated match → membership marked inactive.
 * Memberships the roster doesn't know about are left alone.
 */
export async function syncRosterMembership(userId: string, db: PrismaClient = defaultPrisma): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, eduEmail: true, eduVerified: true },
  });
  if (!user) return;
  const emails = [user.email, user.eduVerified ? user.eduEmail : null]
    .filter((e): e is string => Boolean(e))
    .map((e) => e.trim().toLowerCase());
  if (!emails.length) return;

  const entries = await db.clubRosterEntry.findMany({ where: { email: { in: emails } } });
  const byClub = new Map<string, typeof entries>();
  for (const e of entries) byClub.set(e.clubId, [...(byClub.get(e.clubId) ?? []), e]);

  for (const [clubId, list] of byClub) {
    const active = list.filter((e) => e.active);
    if (active.length) {
      const role = active.some((e) => e.role === "admin") ? "admin" : "member";
      const before = await db.clubMember.findUnique({ where: { clubId_userId: { clubId, userId } }, select: { id: true } });
      await db.clubMember.upsert({
        where: { clubId_userId: { clubId, userId } },
        create: { clubId, userId, role: clubRoleFor(role), active: true },
        update: { role: clubRoleFor(role), active: true },
      });
      if (!before) await db.clubActivity.create({ data: { clubId, userId, kind: "joined" } }).catch(() => null);
      await db.clubJoinRequest.updateMany({
        where: { clubId, userId, status: "pending" },
        data: { status: "approved", decidedAt: new Date() },
      });
    } else {
      await db.clubMember.updateMany({ where: { clubId, userId }, data: { active: false } });
    }
  }
}

/** After roster entries change: re-sync every user whose login or verified .edu email matches. */
export async function backfillRoster(emails: string[], db: PrismaClient = defaultPrisma): Promise<number> {
  const list = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (!list.length) return 0;
  const users = await db.user.findMany({
    where: {
      OR: [
        { email: { in: list, mode: "insensitive" } },
        { eduVerified: true, eduEmail: { in: list, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  for (const u of users) await syncRosterMembership(u.id, db);
  return users.length;
}

/** Adds or updates roster entries (re-activating them), then backfills matching users. Never deletes. */
export async function upsertRoster(
  clubId: string,
  rows: RosterRow[],
  db: PrismaClient = defaultPrisma,
): Promise<{ created: number; updated: number; linkedUsers: number }> {
  let created = 0;
  let updated = 0;
  for (const r of rows) {
    const email = r.email.trim().toLowerCase();
    const existing = await db.clubRosterEntry.findUnique({ where: { clubId_email: { clubId, email } } });
    if (existing) {
      await db.clubRosterEntry.update({
        where: { id: existing.id },
        data: { name: r.name ?? existing.name, role: r.role, active: true },
      });
      updated++;
    } else {
      await db.clubRosterEntry.create({ data: { clubId, email, name: r.name, role: r.role } });
      created++;
    }
  }
  const linkedUsers = await backfillRoster(rows.map((r) => r.email), db);
  return { created, updated, linkedUsers };
}
