/** npm run test-challenge-picker — the duel picker never repeats, honors scope order, and works with 9-question lessons. */
import { PEB_BANK } from "../src/lib/mcq/bank";
import { toLessonId, capitalizeDifficulty } from "../src/lib/mcq/validate";
import { difficultyTargets, pickChallengeQuestions, topUpNote, type PoolQuestion } from "../src/lib/challenge-picker";

let fails = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) fails++;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok || !detail ? "" : ` — ${detail}`}`);
};
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

const bank: PoolQuestion[] = PEB_BANK.map((q) => ({ id: q.id, lessonId: toLessonId(q.lessonId), difficulty: capitalizeDifficulty(q.difficulty) }));
const byLesson = new Map<string, PoolQuestion[]>();
for (const q of bank) byLesson.set(q.lessonId ?? "", [...(byLesson.get(q.lessonId ?? "") ?? []), q]);
const counts = [...byLesson.values()].map((l) => l.length);
check("v2 bank: every lesson has at least 9 questions", Math.min(...counts) >= 9, `min ${Math.min(...counts)}`);
const nine = [...byLesson.entries()].find(([, qs]) => qs.length === 9);
check("v2 bank: some lesson has exactly 9", Boolean(nine));

check("targets 10 → 3/5/2", JSON.stringify(difficultyTargets(10)) === JSON.stringify({ Easy: 3, Medium: 5, Hard: 2 }));
check("targets 5 → 2/2/1", JSON.stringify(difficultyTargets(5)) === JSON.stringify({ Easy: 2, Medium: 2, Hard: 1 }));

for (let seed = 1; seed <= 200; seed++) {
  const [lessonId, primary] = nine ?? ["", []];
  const mod = lessonId.split("-")[0];
  const topUp = bank.filter((q) => q.lessonId?.startsWith(`${mod}-`) && q.lessonId !== lessonId);
  const r = pickChallengeQuestions({ n: 10, primary, topUp, random: seeded(seed) });
  if (new Set(r.ids).size !== r.ids.length) {
    check(`seed ${seed}: no duplicates`, false);
    break;
  }
  if (r.ids.length !== 10 || r.topUpCount !== 1 || !primary.every((q) => r.ids.includes(q.id))) {
    check(`seed ${seed}: 9-question lesson → all 9 + 1 from the module`, false, JSON.stringify(r));
    break;
  }
  if (seed === 200) {
    check("9-question lesson: uses all 9 scope questions, tops up 1, no duplicates (200 runs)", true);
    check("top-up note", topUpNote(r) === `Includes 1 question from Module ${mod}`, String(topUpNote(r)));
  }
}

// Scope with plenty: never leaves scope, 5-question duel.
const mod8 = bank.filter((q) => q.lessonId?.startsWith("8-"));
const r5 = pickChallengeQuestions({ n: 5, primary: mod8, topUp: bank, random: seeded(7) });
check("enough in scope: no top-up", r5.topUpCount === 0 && r5.ids.every((id) => mod8.some((q) => q.id === id)));

// Freshness: fresh questions beat ones either player saw.
const pool: PoolQuestion[] = Array.from({ length: 30 }, (_, i) => ({ id: `q${i}`, lessonId: "1-1", difficulty: ["Easy", "Medium", "Hard"][i % 3] }));
const staleness = new Map(pool.slice(0, 20).map((q, i) => [q.id, i < 10 ? 2 : 1]));
const rf = pickChallengeQuestions({ n: 10, primary: pool, staleness, random: seeded(3) });
check("freshness: all 10 unseen questions chosen first", rf.ids.every((id) => Number(id.slice(1)) >= 20), rf.ids.join(","));
const staleness2 = new Map(pool.map((q, i) => [q.id, i < 25 ? 2 : i < 28 ? 1 : 0]));
const rf2 = pickChallengeQuestions({ n: 10, primary: pool, staleness: staleness2, difficulty: null, random: seeded(4) });
check("freshness: fresh, then one-player, then any", ["q28", "q29"].every((id) => rf2.ids.includes(id)) && ["q25", "q26", "q27"].filter((id) => rf2.ids.includes(id)).length >= 2);

// Difficulty mix.
const big: PoolQuestion[] = Array.from({ length: 60 }, (_, i) => ({ id: `d${i}`, lessonId: "2-1", difficulty: ["Easy", "Medium", "Hard"][i % 3] }));
const mix = pickChallengeQuestions({ n: 10, primary: big, random: seeded(9) });
const diff = (ids: string[], pool: PoolQuestion[]) => ids.map((id) => pool.find((q) => q.id === id)!.difficulty);
const m = diff(mix.ids, big);
check("mix: 3 easy, 5 medium, 2 hard", m.filter((d) => d === "Easy").length === 3 && m.filter((d) => d === "Medium").length === 5 && m.filter((d) => d === "Hard").length === 2, m.join(","));
const fewHard: PoolQuestion[] = [...big.filter((q) => q.difficulty !== "Hard"), ...big.filter((q) => q.difficulty === "Hard").slice(0, 3)];
const hard = diff(pickChallengeQuestions({ n: 10, primary: fewHard, difficulty: "Hard", random: seeded(2) }).ids, fewHard);
check("Hard challenge: all hard first, then medium", hard.filter((d) => d === "Hard").length === 3 && hard.filter((d) => d === "Medium").length === 7, hard.join(","));

// Lesson weights (weekly).
const w = new Map([["3-1", 10]]);
const wpool: PoolQuestion[] = [...Array.from({ length: 20 }, (_, i) => ({ id: `a${i}`, lessonId: "3-1", difficulty: "Medium" })), ...Array.from({ length: 20 }, (_, i) => ({ id: `b${i}`, lessonId: "3-2", difficulty: "Medium" }))];
let weak = 0;
for (let s = 1; s <= 50; s++) weak += pickChallengeQuestions({ n: 10, primary: wpool, lessonWeights: w, difficulty: "Medium", random: seeded(s) }).ids.filter((id) => id.startsWith("a")).length;
check("weekly weights favor the weak lesson", weak / 500 > 0.7, `${Math.round((weak / 500) * 100)}%`);

console.log(fails ? `\n${fails} failed` : "\nChallenge picker checks pass.");
process.exit(fails ? 1 : 0);
