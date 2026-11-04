/**
 * Study group competition rules. Pure (no database), so they can be unit tested and shown on the page.
 *
 * Each person earns points for their team from real study activity; a team's score is the sum of its top
 * members, so bigger groups don't win just by being bigger.
 */

export const POINTS = {
  /** First correct answer to a question each day (practice, daily set, or challenge). */
  correct: 2,
  /** Finishing a lesson. */
  lesson: 25,
  /** Finishing the daily set. */
  dailySet: 10,
  /** Finishing a 1v1 or weekly challenge. */
  challenge: 5,
} as const;

/** Most points one person can earn in a day (rewards showing up every day over one long session). */
export const DAILY_CAP = 150;
/** A team's weekly score counts its best this many members. */
export const TEAM_TOP = 5;
/** Largest team allowed. */
export const MAX_TEAM = 8;
/** A week with at least this many team points keeps the streak going. */
export const STREAK_MIN = 100;
/** Season points for each duel win. */
export const DUEL_WIN_BONUS = 100;
/** People can switch teams this often. */
export const TEAM_SWITCH_DAYS = 7;

export type ActivityKind = keyof typeof POINTS;
export type Activity = { userId: string; kind: ActivityKind; at: Date; key?: string };
export type MemberPoints = { total: number; byKind: Record<ActivityKind, number>; capped: number };

/** YYYY-MM-DD in Eastern time (the club's day). */
export function etDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
}

/** Monday 00:00 Eastern of the week containing `d`, as a UTC Date. */
export function weekStartET(d = new Date()): Date {
  const ymd = etDay(d);
  const [y, m, day] = ymd.split("-").map(Number);
  const noonUtc = new Date(Date.UTC(y, m - 1, day, 12));
  const dow = (noonUtc.getUTCDay() + 6) % 7; // 0 = Monday
  const mondayYmd = new Date(noonUtc.getTime() - dow * 86_400_000).toISOString().slice(0, 10);
  // Midnight Eastern is 04:00 or 05:00 UTC depending on daylight saving.
  for (const h of [4, 5]) {
    const t = new Date(`${mondayYmd}T0${h}:00:00Z`);
    if (etDay(t) === mondayYmd && etDay(new Date(t.getTime() - 1)) !== mondayYmd) return t;
  }
  return new Date(`${mondayYmd}T05:00:00Z`);
}

export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

/**
 * Points per person from raw activity: correct answers count once per question per day, and each
 * person's daily total is capped at DAILY_CAP.
 */
export function scoreActivities(events: Activity[]): Map<string, MemberPoints> {
  const seen = new Set<string>();
  const perDay = new Map<string, number>();
  const out = new Map<string, MemberPoints>();
  const sorted = [...events].sort((a, b) => a.at.getTime() - b.at.getTime());
  for (const e of sorted) {
    const day = etDay(e.at);
    if (e.kind === "correct") {
      const k = `${e.userId}|${e.key}|${day}`;
      if (seen.has(k)) continue;
      seen.add(k);
    }
    const dayKey = `${e.userId}|${day}`;
    const already = perDay.get(dayKey) ?? 0;
    const pts = POINTS[e.kind];
    const allowed = Math.max(0, Math.min(pts, DAILY_CAP - already));
    perDay.set(dayKey, already + pts);
    const m = out.get(e.userId) ?? { total: 0, byKind: { correct: 0, lesson: 0, dailySet: 0, challenge: 0 }, capped: 0 };
    m.total += allowed;
    m.byKind[e.kind] += allowed;
    m.capped += pts - allowed;
    out.set(e.userId, m);
  }
  return out;
}

/** Per-person, per-day counts (what the database adds up). Correct answers are already distinct questions. */
export type DayCounts = { userId: string; day: string; correct: number; lesson: number; dailySet: number; challenge: number };

/** Same rules as scoreActivities, from daily counts: points per kind, then the daily cap (lessons and sets count first). */
export function scoreDays(rows: DayCounts[]): Map<string, MemberPoints> {
  const byUserDay = new Map<string, DayCounts>();
  for (const r of rows) {
    const k = `${r.userId}|${r.day}`;
    const cur = byUserDay.get(k) ?? { userId: r.userId, day: r.day, correct: 0, lesson: 0, dailySet: 0, challenge: 0 };
    cur.correct += r.correct;
    cur.lesson += r.lesson;
    cur.dailySet += r.dailySet;
    cur.challenge += r.challenge;
    byUserDay.set(k, cur);
  }
  const out = new Map<string, MemberPoints>();
  for (const d of byUserDay.values()) {
    const m = out.get(d.userId) ?? { total: 0, byKind: { correct: 0, lesson: 0, dailySet: 0, challenge: 0 }, capped: 0 };
    let left = DAILY_CAP;
    for (const kind of ["lesson", "dailySet", "challenge", "correct"] as ActivityKind[]) {
      const raw = d[kind] * POINTS[kind];
      const got = Math.min(raw, left);
      left -= got;
      m.byKind[kind] += got;
      m.total += got;
      m.capped += raw - got;
    }
    out.set(d.userId, m);
  }
  return out;
}

/** Sum of the best `k` member totals. */
export function teamScore(memberTotals: number[], k = TEAM_TOP): number {
  return [...memberTotals].sort((a, b) => b - a).slice(0, Math.max(0, k)).reduce((s, n) => s + n, 0);
}

/** How many members count on each side of a duel: the smaller team's size, at most TEAM_TOP. */
export const duelCount = (a: number, b: number) => Math.max(1, Math.min(a, b, TEAM_TOP));

export const LEVELS = [
  { name: "Bronze", min: 0 },
  { name: "Silver", min: 1000 },
  { name: "Gold", min: 3000 },
  { name: "Platinum", min: 7000 },
  { name: "Diamond", min: 15000 },
] as const;

export function levelFor(points: number): { name: string; min: number; next: { name: string; min: number } | null; progress: number } {
  let i = 0;
  for (let j = 0; j < LEVELS.length; j++) if (points >= LEVELS[j].min) i = j;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1] ?? null;
  const progress = next ? Math.min(1, (points - cur.min) / (next.min - cur.min)) : 1;
  return { name: cur.name, min: cur.min, next: next ? { name: next.name, min: next.min } : null, progress };
}

/** Weeks in a row (most recent first) at or above STREAK_MIN. The current week counts once it reaches the bar. */
export function weekStreak(weeklyScoresNewestFirst: number[], currentWeekScore: number): number {
  let n = currentWeekScore >= STREAK_MIN ? 1 : 0;
  for (const s of weeklyScoresNewestFirst) {
    if (s >= STREAK_MIN) n++;
    else break;
  }
  return n;
}
