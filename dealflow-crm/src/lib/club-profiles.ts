import "server-only";
import { prisma } from "@/lib/prisma";
import { SOCIAL_USER_WHERE } from "@/lib/club-social";
import { modules } from "@/lib/learn/lessons";
import { STAGE_LABELS } from "@/lib/constants";

/**
 * What PE@Broad members can see about each other. Privacy rules:
 * - Never contact names, emails, phone numbers, notes, or interaction logs — only firm names and stages.
 * - Each block respects the member's sharing toggle; hidden blocks come back as null ("Hidden by member").
 */
export type FirmStage = { firm: string; stage: string };
export type MemberProfile = {
  userId: string;
  name: string;
  role: string;
  classYear: number | null;
  tracks: string[];
  targets: { groups: string[]; firms: string[] } | null;
  firmsInContact: FirmStage[] | null;
  learning: { module: number; title: string; done: number; total: number }[] | null;
  lessonsDone: number | null;
  drill: { xp: number; streak: number; accuracy: number | null; answers: number; byCategory: { category: string; accuracy: number; answers: number }[] } | null;
  recent: { kind: string; data: Record<string, unknown>; createdAt: Date }[];
  lastActiveAt: Date | null;
};

const STAGE_RANK: Record<string, number> = { TARGET: 0, NETWORKING: 1, APPLIED: 2, FIRST_ROUND: 3, TECHNICAL: 4, SUPERDAY: 5, OFFER: 6, REJECTED: -1 };

export const normFirm = (s: string) => s.trim().toLowerCase().replace(/[.,&]/g, "").replace(/\s+/g, " ");

/** Firm name + furthest pipeline stage. Firms with contacts but no opportunity count as "Networking". */
export async function firmsInContact(userIds: string[]): Promise<Map<string, FirmStage[]>> {
  const [opps, contacts] = await Promise.all([
    prisma.opportunity.findMany({ where: { userId: { in: userIds } }, select: { userId: true, stage: true, firm: { select: { name: true } } } }),
    prisma.contact.findMany({ where: { userId: { in: userIds } }, select: { userId: true, firm: { select: { name: true } } } }),
  ]);
  const out = new Map<string, Map<string, { firm: string; rank: number; stage: string }>>();
  const put = (userId: string, firm: string, stage: string) => {
    const k = normFirm(firm);
    if (!k) return;
    const m = out.get(userId) ?? new Map();
    const rank = STAGE_RANK[stage] ?? 0;
    const cur = m.get(k);
    if (!cur || rank > cur.rank) m.set(k, { firm: firm.trim(), rank, stage });
    out.set(userId, m);
  };
  for (const o of opps) if (o.stage !== "REJECTED") put(o.userId, o.firm.name, o.stage);
  for (const c of contacts) if (c.firm?.name) put(c.userId, c.firm.name, "NETWORKING");
  return new Map(
    [...out.entries()].map(([u, m]) => [
      u,
      [...m.values()].sort((a, b) => b.rank - a.rank || a.firm.localeCompare(b.firm)).map((x) => ({ firm: x.firm, stage: STAGE_LABELS[x.stage as keyof typeof STAGE_LABELS] ?? x.stage })),
    ]),
  );
}

export async function memberProfiles(clubId: string, onlyUserId?: string): Promise<MemberProfile[]> {
  const members = await prisma.clubMember.findMany({
    where: { clubId, active: true, user: SOCIAL_USER_WHERE, ...(onlyUserId ? { userId: onlyUserId } : {}) },
    orderBy: { joinedAt: "asc" },
    select: {
      role: true,
      user: {
        select: {
          id: true, name: true, classYear: true, careerTracks: true, recruitingTarget: true, targetFirms: true,
          xp: true, drillStreak: true, lastActiveAt: true,
          shareLearning: true, shareDrill: true, shareTargets: true, shareFirms: true,
        },
      },
    },
  });
  const ids = members.map((m) => m.user.id);
  const [firms, lessons, attempts, activity] = await Promise.all([
    firmsInContact(ids.filter((id) => members.find((m) => m.user.id === id)?.user.shareFirms === true)),
    prisma.lessonProgress.findMany({ where: { userId: { in: ids }, status: "completed" }, select: { userId: true, lessonId: true } }),
    prisma.questionAttempt.groupBy({
      by: ["userId", "correct", "questionId"],
      where: { userId: { in: ids }, question: { mcqEligible: true } },
      _count: { _all: true },
    }),
    prisma.clubActivity.findMany({
      where: { clubId, userId: { in: ids } },
      orderBy: { createdAt: "desc" },
      take: onlyUserId ? 10 : 200,
      select: { userId: true, kind: true, data: true, createdAt: true },
    }),
  ]);
  // Category per question for the drill breakdown.
  const qids = [...new Set(attempts.map((a) => a.questionId))];
  const cats = new Map(
    (await prisma.question.findMany({ where: { id: { in: qids } }, select: { id: true, category: true } })).map((q) => [q.id, q.category]),
  );
  const groups = modules();

  return members.map(({ role, user: u }) => {
    const done = new Set(lessons.filter((l) => l.userId === u.id).map((l) => l.lessonId));
    const mine = attempts.filter((a) => a.userId === u.id);
    let right = 0, total = 0;
    const byCat = new Map<string, { right: number; total: number }>();
    for (const a of mine) {
      const n = a._count._all;
      total += n;
      if (a.correct) right += n;
      const c = cats.get(a.questionId) ?? "Other";
      const s = byCat.get(c) ?? { right: 0, total: 0 };
      s.total += n;
      if (a.correct) s.right += n;
      byCat.set(c, s);
    }
    return {
      userId: u.id,
      name: u.name,
      role,
      classYear: u.classYear,
      tracks: u.careerTracks,
      targets: u.shareTargets ? { groups: u.recruitingTarget, firms: u.targetFirms } : null,
      firmsInContact: u.shareFirms === true ? (firms.get(u.id) ?? []) : null,
      learning: u.shareLearning ? groups.map((g) => ({ module: g.module, title: g.title, done: g.lessons.filter((l) => done.has(l.id)).length, total: g.lessons.length })) : null,
      lessonsDone: u.shareLearning ? done.size : null,
      drill: u.shareDrill
        ? {
            xp: u.xp,
            streak: u.drillStreak,
            answers: total,
            accuracy: total ? Math.round((right / total) * 100) : null,
            byCategory: [...byCat.entries()]
              .map(([category, s]) => ({ category, answers: s.total, accuracy: Math.round((s.right / s.total) * 100) }))
              .sort((a, b) => b.answers - a.answers),
          }
        : null,
      recent: activity.filter((a) => a.userId === u.id).slice(0, onlyUserId ? 10 : 2).map((a) => ({ kind: a.kind, data: a.data as Record<string, unknown>, createdAt: a.createdAt })),
      lastActiveAt: u.lastActiveAt,
    };
  });
}

/** Other members (sharing their firm list) who are talking to the same firm. */
export async function firmOverlap(clubId: string, firmName: string, excludeUserId?: string) {
  const members = await prisma.clubMember.findMany({
    where: { clubId, active: true, user: { ...SOCIAL_USER_WHERE, shareFirms: true } },
    select: { user: { select: { id: true, name: true } } },
  });
  const ids = members.map((m) => m.user.id).filter((id) => id !== excludeUserId);
  const map = await firmsInContact(ids);
  const key = normFirm(firmName);
  return members
    .filter((m) => m.user.id !== excludeUserId)
    .map((m) => ({ userId: m.user.id, name: m.user.name, stage: map.get(m.user.id)?.find((f) => normFirm(f.firm) === key)?.stage }))
    .filter((m): m is { userId: string; name: string; stage: string } => Boolean(m.stage));
}

export function activityText(kind: string, data: Record<string, unknown>): string {
  switch (kind) {
    case "lesson_complete":
      return `completed lesson ${String(data.lessonId ?? "").replace("-", ".")} ${data.title ?? ""}`.trim();
    case "module_complete":
      return `finished Module ${data.module}: ${data.title ?? ""}`;
    case "streak":
      return `was active ${data.days} days in a row`;
    case "joined":
      return "joined PE@Broad";
    case "challenge_result":
      return String(data.text ?? "finished a challenge");
    case "weekly_challenge":
      return String(data.text ?? "This week's club challenge is live");
    case "club_post":
      return String(data.text ?? "posted to the club");
    default:
      return kind;
  }
}
