/** npm run test-partial-json — reading an email draft's subject/body while the JSON is still streaming. */
import { partialString, partialStringArray } from "../src/lib/partial-json";

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : `: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
};
const full = JSON.stringify({ subjects: ["MSU sophomore — Jefferies TMT", 'Quick "question"'], body: "Hi Dana,\n\nI'm a sophomore at MSU.\n\nBest,\nAlex", personalization: [] });
eq("body not started", partialString('{"subjects":["a"', "body"), "");
eq("subjects mid-array", partialStringArray('{"subjects":["MSU sophomore", "Quick', "subjects"), ["MSU sophomore"]);
for (const cut of [40, 70, 95, full.length]) {
  const soFar = full.slice(0, cut);
  const body = partialString(soFar, "body");
  if (!"Hi Dana,\n\nI'm a sophomore at MSU.\n\nBest,\nAlex".startsWith(body)) eq(`body prefix at ${cut}`, body, "a prefix of the body");
}
eq("full body", partialString(full, "body"), "Hi Dana,\n\nI'm a sophomore at MSU.\n\nBest,\nAlex");
eq("full subjects with escapes", partialStringArray(full, "subjects"), ["MSU sophomore — Jefferies TMT", 'Quick "question"']);
eq("escape cut mid-stream", partialString('{"body":"Hi\\', "body"), "Hi");
eq("unicode escape", partialString('{"body":"caf\\u00e9 ok', "body"), "café ok");
console.log(fails ? `\n${fails} failed` : "\nPartial JSON checks pass.");
process.exit(fails ? 1 : 0);
