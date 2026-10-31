/**
 * Verifies every seeded question has hand-authored drill choices and flags weak MCQs
 * (duplicate options, or a correct answer that is much longer/shorter than the distractors).
 * Run: npm run check:mcq
 */
import { SEED_QUESTIONS } from "../prisma/seed/questions";
import { SEED_QUESTIONS_EXTENDED } from "../prisma/seed/questions-extended";
import { SEED_TRACK_QUESTIONS } from "../prisma/seed/track-questions";
import { SEED_THIN_CATEGORY_QUESTIONS } from "../prisma/seed/questions-thin-categories";
import { FIRM_DRILL_QUESTIONS } from "../src/lib/drill-mcq/firm-questions";
import { getAuthoredMcq } from "../src/lib/drill-mcq";

const all = [
  ...SEED_QUESTIONS,
  ...SEED_QUESTIONS_EXTENDED,
  ...SEED_TRACK_QUESTIONS,
  ...SEED_THIN_CATEGORY_QUESTIONS,
  ...FIRM_DRILL_QUESTIONS,
].map((q) => q.question);

let problems = 0;
for (const q of all) {
  const m = getAuthoredMcq(q);
  if (!m) {
    console.log(`MISSING  ${q}`);
    problems++;
    continue;
  }
  const opts = [m.c, ...m.w];
  if (new Set(opts).size !== 4) {
    console.log(`DUPLICATE OPTIONS  ${q}`);
    problems++;
  }
  const avgWrong = m.w.reduce((s, w) => s + w.length, 0) / 3;
  const ratio = m.c.length / avgWrong;
  if (ratio > 1.6 || ratio < 0.55) {
    console.log(`LENGTH TELL (${ratio.toFixed(2)})  ${q}`);
  }
}
console.log(`${all.length} questions checked, ${problems} problems.`);
process.exit(problems ? 1 : 0);
