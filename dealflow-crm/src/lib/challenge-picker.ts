/**
 * Challenge question picker (Fit & Practice spec F1.3). Pure: the caller loads the pools and who has
 * seen what, so this can be unit tested.
 *
 * 1. Scope: the chosen lessons first; if they don't have enough questions, top up from the same module(s).
 * 2. Freshness: questions neither player answered in the last 30 days, then one player, then any.
 * 3. Difficulty: about 30% easy / 50% medium / 20% hard (3/5/2 for 10). A "Hard" challenge uses hard first,
 *    then medium. Never repeats a question.
 */

export type PoolQuestion = { id: string; lessonId: string | null; difficulty: string };
export type PickInput = {
  n: number;
  /** Questions in the chosen scope (lessons, modules, or everything). */
  primary: PoolQuestion[];
  /** Same-module questions outside the chosen lessons (used only when `primary` is short). */
  topUp?: PoolQuestion[];
  /** questionId → how stale it is: 0 = fresh, 1 = one player saw it, 2 = both (or most of the club). */
  staleness?: Map<string, number>;
  /** lessonId → weight (weekly challenge favors weak lessons). */
  lessonWeights?: Map<string, number>;
  difficulty?: string | null;
  /** Random source (tests pass a seeded one). */
  random?: () => number;
};
export type PickResult = { ids: string[]; topUpCount: number; topUpModules: number[] };

const DIFFS = ["Easy", "Medium", "Hard"] as const;

/** Target counts per difficulty for n questions: 3/5/2 for 10, scaled otherwise. */
export function difficultyTargets(n: number, difficulty?: string | null): Record<string, number> {
  if (difficulty === "Hard") return { Hard: n, Medium: 0, Easy: 0 };
  if (difficulty === "Easy") return { Easy: n, Medium: 0, Hard: 0 };
  if (difficulty === "Medium") return { Medium: n, Easy: 0, Hard: 0 };
  const easy = Math.round(n * 0.3);
  const hard = Math.round(n * 0.2);
  return { Easy: easy, Medium: Math.max(0, n - easy - hard), Hard: hard };
}

/** When a difficulty runs short, which difficulty fills in next. */
const FALLBACK: Record<string, string[]> = {
  Hard: ["Medium", "Easy"],
  Medium: ["Easy", "Hard"],
  Easy: ["Medium", "Hard"],
};

export function pickChallengeQuestions(input: PickInput): PickResult {
  const rnd = input.random ?? Math.random;
  const stale = input.staleness ?? new Map<string, number>();
  const weightOf = (q: PoolQuestion) => Math.max(0.01, input.lessonWeights?.get(q.lessonId ?? "") ?? 1);
  // Weighted random order (Efraimidis–Spirakis), computed once per question.
  const key = new Map<string, number>();
  const rank = (q: PoolQuestion) => {
    if (!key.has(q.id)) key.set(q.id, Math.pow(rnd(), 1 / weightOf(q)));
    return key.get(q.id)!;
  };
  const order = (qs: PoolQuestion[]) =>
    [...qs].sort((a, b) => (stale.get(a.id) ?? 0) - (stale.get(b.id) ?? 0) || rank(b) - rank(a));

  const dedupe = (qs: PoolQuestion[]) => {
    const seen = new Set<string>();
    return qs.filter((q) => (seen.has(q.id) ? false : (seen.add(q.id), true)));
  };
  const primary = dedupe(input.primary);
  const primaryIds = new Set(primary.map((q) => q.id));
  const topUpPool = dedupe((input.topUp ?? []).filter((q) => !primaryIds.has(q.id)));

  const chosen: PoolQuestion[] = [];
  const taken = new Set<string>();
  const take = (q: PoolQuestion) => {
    if (taken.has(q.id) || chosen.length >= input.n) return false;
    taken.add(q.id);
    chosen.push(q);
    return true;
  };

  const fill = (pool: PoolQuestion[], n: number) => {
    const targets = difficultyTargets(n, input.difficulty);
    const byDiff = new Map(DIFFS.map((d) => [d as string, order(pool.filter((q) => q.difficulty === d))]));
    const start = chosen.length;
    const deficit: Record<string, number> = { ...targets };
    // Freshness comes first: at each staleness tier, every difficulty takes its share, and a shortfall
    // moves to the nearest difficulty before anything staler is used.
    for (let tier = 0; tier <= 2; tier++) {
      const ok = (q: PoolQuestion) => (stale.get(q.id) ?? 0) <= tier;
      for (const d of DIFFS) {
        for (const q of byDiff.get(d) ?? []) {
          if (!deficit[d]) break;
          if (ok(q) && take(q)) deficit[d]--;
        }
      }
      for (const d of DIFFS) {
        for (const alt of FALLBACK[d]) {
          for (const q of byDiff.get(alt) ?? []) {
            if (!deficit[d]) break;
            if (ok(q) && take(q)) deficit[d]--;
          }
        }
      }
    }
    // Anything left (odd difficulty labels, tiny pools): freshest first.
    for (const q of order(pool)) if (chosen.length - start < n) take(q);
  };

  if (primary.length >= input.n || !topUpPool.length) {
    fill(primary, Math.min(input.n, primary.length));
  } else {
    // Use every question in scope, then top up from the module.
    for (const q of order(primary)) take(q);
    fill(topUpPool, input.n - chosen.length);
  }

  const topUpChosen = chosen.filter((q) => !primaryIds.has(q.id));
  const topUpModules = [...new Set(topUpChosen.map((q) => Number((q.lessonId ?? "").split("-")[0])).filter((m) => Number.isFinite(m) && m >= 0))].sort((a, b) => a - b);
  // Easy → hard, so the challenge ramps up.
  const diffRank = (d: string) => (DIFFS as readonly string[]).indexOf(d);
  const ids = [...chosen].sort((a, b) => diffRank(a.difficulty) - diffRank(b.difficulty)).map((q) => q.id);
  return { ids, topUpCount: topUpChosen.length, topUpModules };
}

/** "Includes 2 questions from Module 8" for the challenge card. */
export function topUpNote(r: Pick<PickResult, "topUpCount" | "topUpModules">): string | null {
  if (!r.topUpCount) return null;
  return `Includes ${r.topUpCount} question${r.topUpCount === 1 ? "" : "s"} from Module ${r.topUpModules.join(", ")}`;
}
