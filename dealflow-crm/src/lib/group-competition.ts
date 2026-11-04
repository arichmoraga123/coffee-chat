import "server-only";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import {
  DUEL_WIN_BONUS,
  MAX_TEAM,
  TEAM_SWITCH_DAYS,
  addDays,
  duelCount,
  etDay,
  levelFor,
  scoreDays,
  teamScore,
  weekStartET,
  weekStreak,
  type DayCounts,
  type MemberPoints,
} from "@/lib/group-points-rules";

/** Study group competition: points from real activity, the weekly league, and group duels. */

export const newJoinCode = () => randomBytes(4).toString("hex").toUpperCase();

/** Per-person, per-day activity counts between `from` and `to` (the database does the adding up). */
async function dayCounts(userIds: string[], from: Date, to: Date): Promise<DayCounts[]> {
  if (!userIds.length) return [];
  const tz = Prisma.sql`'America/New_York'`;
  const day = (col: string) => Prisma.sql`to_char((${Prisma.raw(`"${col}"`)} AT TIME ZONE 'UTC') AT TIME ZONE ${tz}, 'YYYY-MM-DD')`;
  const [correct, lessons, challenges, daily] = await Promise.all([
    prisma.$queryRaw<{ userId: string; day: string; n: number }[]>(Prisma.sql`
      SELECT "userId", ${day("createdAt")} AS day, COUNT(DISTINCT "questionId")::int AS n
      FROM "QuestionAttempt"
      WHERE correct AND "userId" = ANY(${userIds}) AND "createdAt" >= ${from} AND "createdAt" < ${to}
      GROUP BY 1, 2`),
    prisma.$queryRaw<{ userId: string; day: string; n: number }[]>(Prisma.sql`
      SELECT "userId", ${day("completedAt")} AS day, COUNT(*)::int AS n
      FROM "LessonProgress"
      WHERE status = 'completed' AND "userId" = ANY(${userIds}) AND "completedAt" >= ${from} AND "completedAt" < ${to}
      GROUP BY 1, 2`),
    prisma.$queryRaw<{ userId: string; day: string; n: number }[]>(Prisma.sql`
      SELECT "userId", ${day("finishedAt")} AS day, COUNT(*)::int AS n
      FROM "ChallengeParticipant"
      WHERE "userId" = ANY(${userIds}) AND "finishedAt" >= ${from} AND "finishedAt" < ${to}
      GROUP BY 1, 2`),
    prisma.dailyDrillLog.findMany({
      where: { userId: { in: userIds }, date: { gte: etDay(from), lt: etDay(to) } },
      select: { userId: true, date: true },
    }),
  ]);
  const rows: DayCounts[] = [];
  const blank = (userId: string, d: string): DayCounts => ({ userId, day: d, correct: 0, lesson: 0, dailySet: 0, challenge: 0 });
  for (const r of correct) rows.push({ ...blank(r.userId, r.day), correct: r.n });
  for (const r of lessons) rows.push({ ...blank(r.userId, r.day), lesson: r.n });
  for (const r of challenges) rows.push({ ...blank(r.userId, r.day), challenge: r.n });
  for (const r of daily) rows.push({ ...blank(r.userId, r.date), dailySet: 1 });
  return rows;
}

/** Points per person in a window. `since` (per person) ignores activity before they joined the team. */
export async function pointsFor(userIds: string[], from: Date, to: Date, since?: Map<string, Date | null>): Promise<Map<string, MemberPoints>> {
  let rows = await dayCounts(userIds, from, to);
  if (since) rows = rows.filter((r) => !since.get(r.userId) || r.day >= etDay(since.get(r.userId)!));
  return scoreDays(rows);
}

type TeamMember = { id: string; name: string; teamGroupId: string | null; teamJoinedAt: Date | null };

async function teamMembers(groupIds: string[]): Promise<Map<string, TeamMember[]>> {
  const users = await prisma.user.findMany({
    where: { teamGroupId: { in: groupIds }, deletedAt: null, accountActive: true },
    select: { id: true, name: true, teamGroupId: true, teamJoinedAt: true },
  });
  const out = new Map<string, TeamMember[]>();
  for (const u of users) out.set(u.teamGroupId!, [...(out.get(u.teamGroupId!) ?? []), u]);
  return out;
}

const HISTORY_WEEKS = 12;

export type LeagueRow = {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  members: number;
  teamSize: number;
  week: number;
  lastWeek: number;
  rank: number;
  streak: number;
  season: number;
  level: ReturnType<typeof levelFor>;
  record: { w: number; l: number; t: number };
};

/** Every group with at least one team member: this week's score, last week, streak, level, duel record. */
export async function leagueTable(now = new Date()): Promise<LeagueRow[]> {
  await finalizeDueDuels(now);
  const groups = await prisma.studyGroup.findMany({ select: { id: true, name: true, description: true, visibility: true, _count: { select: { members: true } } } });
  const teams = await teamMembers(groups.map((g) => g.id));
  const all = [...teams.values()].flat();
  const thisWeek = weekStartET(now);
  const from = addDays(thisWeek, -7 * HISTORY_WEEKS);
  const since = new Map(all.map((u) => [u.id, u.teamJoinedAt]));
  const rows = await dayCounts(all.map((u) => u.id), from, now);
  const filtered = rows.filter((r) => !since.get(r.userId) || r.day >= etDay(since.get(r.userId)!));
  // Bucket by week (index 0 = this week, 1 = last week, …).
  const weekOf = (day: string) => {
    const d = new Date(`${day}T12:00:00Z`);
    return Math.floor((thisWeek.getTime() - weekStartET(d).getTime()) / (7 * 86_400_000) + 0.5);
  };
  const byWeek = new Map<number, DayCounts[]>();
  for (const r of filtered) byWeek.set(weekOf(r.day), [...(byWeek.get(weekOf(r.day)) ?? []), r]);
  const weekScores = new Map<number, Map<string, MemberPoints>>();
  for (const [w, rs] of byWeek) weekScores.set(w, scoreDays(rs));

  const duels = await prisma.groupDuel.findMany({ where: { status: "finished" }, select: { challengerId: true, opponentId: true, winnerId: true } });
  const record = (id: string) => {
    const mine = duels.filter((d) => d.challengerId === id || d.opponentId === id);
    const w = mine.filter((d) => d.winnerId === id).length;
    const t = mine.filter((d) => !d.winnerId).length;
    return { w, l: mine.length - w - t, t };
  };

  const out: LeagueRow[] = [];
  for (const g of groups) {
    const members = teams.get(g.id) ?? [];
    if (!members.length) continue;
    const scoreForWeek = (w: number) => teamScore(members.map((m) => weekScores.get(w)?.get(m.id)?.total ?? 0));
    const history = Array.from({ length: HISTORY_WEEKS }, (_, i) => scoreForWeek(i + 1));
    const week = scoreForWeek(0);
    const rec = record(g.id);
    const season = week + history.reduce((s, n) => s + n, 0) + rec.w * DUEL_WIN_BONUS;
    out.push({
      id: g.id,
      name: g.name,
      description: g.description,
      visibility: g.visibility,
      members: g._count.members,
      teamSize: members.length,
      week,
      lastWeek: history[0],
      rank: 0,
      streak: weekStreak(history, week),
      season,
      level: levelFor(season),
      record: rec,
    });
  }
  out.sort((a, b) => b.week - a.week || b.season - a.season || a.name.localeCompare(b.name));
  out.forEach((r, i) => (r.rank = i + 1));
  return out;
}

/** This week's points for each team member of a group (for the contributions table). */
export async function teamContributions(groupId: string, now = new Date()) {
  const members = (await teamMembers([groupId])).get(groupId) ?? [];
  const pts = await pointsFor(members.map((m) => m.id), weekStartET(now), now, new Map(members.map((m) => [m.id, m.teamJoinedAt])));
  return members
    .map((m) => ({ id: m.id, name: m.name, points: pts.get(m.id) ?? { total: 0, byKind: { correct: 0, lesson: 0, dailySet: 0, challenge: 0 }, capped: 0 } }))
    .sort((a, b) => b.points.total - a.points.total);
}

/* ───────── team membership ───────── */

/** Makes a group this person's team (or explains why not). */
export async function setTeam(userId: string, groupId: string): Promise<{ ok: true } | { error: string }> {
  const [member, user, size] = await Promise.all([
    prisma.studyGroupMember.findUnique({ where: { groupId_userId: { groupId, userId } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { teamGroupId: true, teamJoinedAt: true } }),
    prisma.user.count({ where: { teamGroupId: groupId } }),
  ]);
  if (!member) return { error: "Join the group first." };
  if (user?.teamGroupId === groupId) return { ok: true };
  if (size >= MAX_TEAM) return { error: `This team is full (${MAX_TEAM} people).` };
  if (user?.teamGroupId && user.teamJoinedAt && addDays(user.teamJoinedAt, TEAM_SWITCH_DAYS) > new Date()) {
    const when = addDays(user.teamJoinedAt, TEAM_SWITCH_DAYS).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });
    return { error: `You can switch teams once a week — next on ${when}.` };
  }
  await prisma.user.update({ where: { id: userId }, data: { teamGroupId: groupId, teamJoinedAt: new Date() } });
  return { ok: true };
}

/** After joining a group, it becomes your team if you don't have one yet. */
export async function teamIfNone(userId: string, groupId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { teamGroupId: true } });
  if (!u?.teamGroupId) await setTeam(userId, groupId);
}

/** Leaving a group also leaves its team. */
export async function leaveGroup(userId: string, groupId: string) {
  await prisma.studyGroupMember.deleteMany({ where: { groupId, userId } });
  await prisma.user.updateMany({ where: { id: userId, teamGroupId: groupId }, data: { teamGroupId: null, teamJoinedAt: null } });
  // Keep a captain: promote the longest-standing member if the last admin left.
  const admins = await prisma.studyGroupMember.count({ where: { groupId, role: "admin" } });
  if (!admins) {
    const next = await prisma.studyGroupMember.findFirst({ where: { groupId }, orderBy: { id: "asc" } });
    if (next) await prisma.studyGroupMember.update({ where: { id: next.id }, data: { role: "admin" } });
  }
}

/* ───────── duels ───────── */

const PENDING_HOURS = 48;
export const DUEL_DAYS = [3, 7] as const;

const isCaptain = async (userId: string, groupId: string) => Boolean(await prisma.studyGroupMember.findFirst({ where: { groupId, userId, role: "admin" } }));

async function notifyGroup(groupId: string, payload: { title: string; body: string; url: string }, except?: string) {
  const members = await prisma.studyGroupMember.findMany({ where: { groupId }, select: { userId: true } });
  for (const m of members) if (m.userId !== except) await notify(m.userId, "group_duel", payload).catch(() => {});
}

export async function createDuel(userId: string, challengerId: string, opponentId: string, days: number) {
  if (challengerId === opponentId) return { error: "Pick another group." } as const;
  if (!DUEL_DAYS.includes(days as 3 | 7)) return { error: "Duels last 3 or 7 days." } as const;
  if (!(await isCaptain(userId, challengerId))) return { error: "Only the group's captain can start a duel." } as const;
  const teams = await teamMembers([challengerId, opponentId]);
  if (!teams.get(challengerId)?.length) return { error: "Your group needs at least one person on its team." } as const;
  if (!teams.get(opponentId)?.length) return { error: "That group has no team members yet." } as const;
  const open = await prisma.groupDuel.findFirst({
    where: {
      status: { in: ["pending", "active"] },
      OR: [
        { challengerId, opponentId },
        { challengerId: opponentId, opponentId: challengerId },
      ],
    },
  });
  if (open) return { error: "These groups already have a duel going." } as const;
  const duel = await prisma.groupDuel.create({ data: { challengerId, opponentId, durationDays: days, createdById: userId } });
  const challenger = await prisma.studyGroup.findUnique({ where: { id: challengerId }, select: { name: true } });
  await notifyGroup(opponentId, { title: `${challenger?.name ?? "A group"} challenged your group`, body: `A ${days}-day points duel. Your captain can accept it.`, url: `/groups/${opponentId}` });
  return { id: duel.id } as const;
}

export async function respondDuel(userId: string, duelId: string, action: "accept" | "decline" | "cancel") {
  const d = await prisma.groupDuel.findUnique({ where: { id: duelId }, include: { challenger: { select: { name: true } }, opponent: { select: { name: true } } } });
  if (!d || d.status !== "pending") return { error: "That duel isn't waiting for an answer." } as const;
  if (action === "cancel") {
    if (!(await isCaptain(userId, d.challengerId))) return { error: "Only the challenging captain can cancel." } as const;
    await prisma.groupDuel.update({ where: { id: duelId }, data: { status: "cancelled", respondedById: userId } });
    return { ok: true } as const;
  }
  if (!(await isCaptain(userId, d.opponentId))) return { error: "Only the challenged group's captain can answer." } as const;
  if (action === "decline") {
    await prisma.groupDuel.update({ where: { id: duelId }, data: { status: "declined", respondedById: userId } });
    await notifyGroup(d.challengerId, { title: `${d.opponent.name} declined your duel`, body: "Try another group.", url: `/groups/${d.challengerId}` });
    return { ok: true } as const;
  }
  const teams = await teamMembers([d.challengerId, d.opponentId]);
  const now = new Date();
  await prisma.groupDuel.update({
    where: { id: duelId },
    data: {
      status: "active",
      respondedById: userId,
      startsAt: now,
      endsAt: addDays(now, d.durationDays),
      challengerMembers: (teams.get(d.challengerId) ?? []).map((m) => m.id),
      opponentMembers: (teams.get(d.opponentId) ?? []).map((m) => m.id),
    },
  });
  const msg = { title: `Duel on: ${d.challenger.name} vs ${d.opponent.name}`, body: `${d.durationDays} days. Lessons and questions earn points for your team.`, url: "" };
  await notifyGroup(d.challengerId, { ...msg, url: `/groups/${d.challengerId}` });
  await notifyGroup(d.opponentId, { ...msg, url: `/groups/${d.opponentId}` }, userId);
  return { ok: true } as const;
}

export type DuelSide = { groupId: string; name: string; score: number; counted: number; members: { id: string; name: string; points: number; counted: boolean }[] };
export type DuelView = {
  id: string;
  status: string;
  durationDays: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  winnerId: string | null;
  challenger: DuelSide;
  opponent: DuelSide;
};

/** Live (or final) score for an active or finished duel: each side's top N members, N = the smaller team. */
async function scoreDuel(d: { challengerMembers: string[]; opponentMembers: string[]; startsAt: Date | null; endsAt: Date | null }, now = new Date()) {
  const to = d.endsAt && d.endsAt < now ? d.endsAt : now;
  const ids = [...d.challengerMembers, ...d.opponentMembers];
  const pts = d.startsAt ? await pointsFor(ids, d.startsAt, to) : new Map<string, MemberPoints>();
  const n = duelCount(d.challengerMembers.length, d.opponentMembers.length);
  const side = (members: string[]) => {
    const list = members.map((id) => ({ id, points: pts.get(id)?.total ?? 0 })).sort((a, b) => b.points - a.points);
    return { score: teamScore(list.map((x) => x.points), n), list: list.map((x, i) => ({ ...x, counted: i < n })), counted: n };
  };
  return { challenger: side(d.challengerMembers), opponent: side(d.opponentMembers) };
}

/** Closes duels whose time is up, and expires unanswered challenges. Safe to call often. */
export async function finalizeDueDuels(now = new Date()) {
  await prisma.groupDuel.updateMany({ where: { status: "pending", createdAt: { lt: new Date(now.getTime() - PENDING_HOURS * 3_600_000) } }, data: { status: "expired" } });
  const due = await prisma.groupDuel.findMany({ where: { status: "active", endsAt: { lte: now } }, include: { challenger: { select: { name: true } }, opponent: { select: { name: true } } } });
  for (const d of due) {
    const s = await scoreDuel(d, now);
    const winnerId = s.challenger.score === s.opponent.score ? null : s.challenger.score > s.opponent.score ? d.challengerId : d.opponentId;
    const res = await prisma.groupDuel.updateMany({
      where: { id: d.id, status: "active" },
      data: { status: "finished", challengerScore: s.challenger.score, opponentScore: s.opponent.score, winnerId, finishedAt: now },
    });
    if (!res.count) continue; // someone else finished it
    const line = `${d.challenger.name} ${s.challenger.score} – ${s.opponent.score} ${d.opponent.name}`;
    const title = winnerId ? `${winnerId === d.challengerId ? d.challenger.name : d.opponent.name} won the duel` : "The duel ended in a tie";
    await notifyGroup(d.challengerId, { title, body: line, url: `/groups/${d.challengerId}` });
    await notifyGroup(d.opponentId, { title, body: line, url: `/groups/${d.opponentId}` });
  }
  return due.length;
}

/** Duels for a group: open ones first, then the latest finished ones, with live scores. */
export async function duelsForGroup(groupId: string, now = new Date()): Promise<DuelView[]> {
  await finalizeDueDuels(now);
  const duels = await prisma.groupDuel.findMany({
    where: { OR: [{ challengerId: groupId }, { opponentId: groupId }], status: { in: ["pending", "active", "finished"] } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { challenger: { select: { name: true } }, opponent: { select: { name: true } } },
  });
  const names = new Map((await prisma.user.findMany({ where: { id: { in: duels.flatMap((d) => [...d.challengerMembers, ...d.opponentMembers]) } }, select: { id: true, name: true } })).map((u) => [u.id, u.name]));
  const out: DuelView[] = [];
  for (const d of duels) {
    const s = d.status === "pending" ? null : await scoreDuel(d, now);
    const side = (gid: string, name: string, sc: Awaited<ReturnType<typeof scoreDuel>>["challenger"] | null, stored: number | null): DuelSide => ({
      groupId: gid,
      name,
      score: stored ?? sc?.score ?? 0,
      counted: sc?.counted ?? 0,
      members: (sc?.list ?? []).map((m) => ({ id: m.id, name: names.get(m.id) ?? "Member", points: m.points, counted: m.counted })),
    });
    out.push({
      id: d.id,
      status: d.status,
      durationDays: d.durationDays,
      startsAt: d.startsAt?.toISOString() ?? null,
      endsAt: d.endsAt?.toISOString() ?? null,
      createdAt: d.createdAt.toISOString(),
      winnerId: d.winnerId,
      challenger: side(d.challengerId, d.challenger.name, s?.challenger ?? null, d.challengerScore),
      opponent: side(d.opponentId, d.opponent.name, s?.opponent ?? null, d.opponentScore),
    });
  }
  const order = (st: string) => (st === "active" ? 0 : st === "pending" ? 1 : 2);
  return out.sort((a, b) => order(a.status) - order(b.status));
}
