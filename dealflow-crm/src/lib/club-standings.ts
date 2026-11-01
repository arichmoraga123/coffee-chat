import "server-only";
import { prisma } from "@/lib/prisma";
import { SOCIAL_USER_WHERE } from "@/lib/club-social";

export type StandingRow = {
  userId: string;
  name: string;
  weeklyXP: number;
  xp: number;
  streak: number;
  answers: number;
  accuracy: number | null;
  lessons: number;
  weeklyChallenge: number | null;
};

export const MIN_ACCURACY_ANSWERS = 20;

/** Every active, non-deleted PE@Broad member with their numbers. */
export async function clubStandings(clubId: string): Promise<StandingRow[]> {
  const members = await prisma.clubMember.findMany({
    where: { clubId, active: true, user: SOCIAL_USER_WHERE },
    select: { user: { select: { id: true, name: true, weeklyXP: true, xp: true, drillStreak: true } } },
  });
  const ids = members.map((m) => m.user.id);
  const [attempts, lessons, weekly] = await Promise.all([
    prisma.questionAttempt.groupBy({
      by: ["userId", "correct"],
      where: { userId: { in: ids }, question: { mcqEligible: true } },
      _count: { _all: true },
    }),
    prisma.lessonProgress.groupBy({ by: ["userId"], where: { userId: { in: ids }, status: "completed" }, _count: { _all: true } }),
    prisma.challenge.findFirst({
      where: { clubId, mode: "weekly" },
      orderBy: { createdAt: "desc" },
      select: { participants: { where: { finishedAt: { not: null } }, select: { userId: true, score: true } } },
    }),
  ]);
  const acc = new Map<string, { right: number; total: number }>();
  for (const a of attempts) {
    const s = acc.get(a.userId) ?? { right: 0, total: 0 };
    s.total += a._count._all;
    if (a.correct) s.right += a._count._all;
    acc.set(a.userId, s);
  }
  const lessonCount = new Map(lessons.map((l) => [l.userId, l._count._all]));
  const weeklyScore = new Map((weekly?.participants ?? []).map((p) => [p.userId, p.score]));
  return members.map(({ user: u }) => {
    const a = acc.get(u.id);
    return {
      userId: u.id,
      name: u.name,
      weeklyXP: u.weeklyXP,
      xp: u.xp,
      streak: u.drillStreak,
      answers: a?.total ?? 0,
      accuracy: a && a.total ? Math.round((a.right / a.total) * 100) : null,
      lessons: lessonCount.get(u.id) ?? 0,
      weeklyChallenge: weeklyScore.get(u.id) ?? null,
    };
  });
}

export const STANDING_TABS = [
  { key: "weekly", label: "This week", metric: (r: StandingRow) => r.weeklyXP },
  { key: "all", label: "All time", metric: (r: StandingRow) => r.xp },
  { key: "streak", label: "Streak", metric: (r: StandingRow) => r.streak },
  { key: "accuracy", label: "Accuracy", metric: (r: StandingRow) => (r.answers >= MIN_ACCURACY_ANSWERS ? (r.accuracy ?? 0) : -1) },
  { key: "lessons", label: "Lessons", metric: (r: StandingRow) => r.lessons },
  { key: "challenge", label: "Weekly challenge", metric: (r: StandingRow) => r.weeklyChallenge ?? -1 },
] as const;
export type StandingTab = (typeof STANDING_TABS)[number]["key"];
