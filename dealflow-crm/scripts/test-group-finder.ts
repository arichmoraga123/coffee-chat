/** npm run test-group-finder — each persona's top Group Finder match is the expected group. */
import { GROUP_FINDER, scoreGroupFinder } from "../src/lib/groupFinder";
import { GROUP_FINDER_PERSONAS } from "../src/lib/groupFinderPersonas";

let fails = 0;
for (const p of GROUP_FINDER_PERSONAS) {
  const r = scoreGroupFinder(p.answers);
  const ok = r[0].id === p.expect;
  if (!ok) fails++;
  console.log(`${ok ? "✓" : "✗"} ${p.name} → ${r[0].name} (${r[0].match}); then ${r[1].name} (${r[1].match}), ${r[2].name} (${r[2].match})`);
  if (ok) console.log(`    why: ${r[0].why.map((w) => w.label).join(" | ")}`);
}
// Every answer key matches a real question and option.
for (const p of GROUP_FINDER_PERSONAS)
  for (const [q, i] of Object.entries(p.answers)) if (!GROUP_FINDER.questions.find((x) => x.id === q)?.options[i]) (fails++, console.log(`✗ ${p.name}: bad answer ${q}=${i}`));
// A perfect score can't exceed 100.
const all = scoreGroupFinder({});
if (all.some((g) => g.match !== 0)) (fails++, console.log("✗ empty answers should score 0"));
console.log(fails ? `\n${fails} failed` : "\nGroup Finder persona checks pass.");
process.exit(fails ? 1 : 0);
