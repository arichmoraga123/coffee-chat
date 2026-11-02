/**
 * Formatting checks against the fixture PDFs in scripts/fixtures/resumes/ (expected results below).
 * npm run test-resume-format
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { runFormatChecks, type CheckId } from "../src/lib/resume/format-checks";

const DIR = path.join(__dirname, "fixtures", "resumes");
const EXPECT: Record<string, { pass: CheckId[]; fail: CheckId[]; maxScore?: number; minScore?: number }> = {
  "freshman-strong.pdf": {
    pass: ["length", "pageFill", "margins", "fonts", "bodySize", "name", "headers", "dates", "bullets", "bulletsPerEntry", "sectionOrder", "contact", "graphics"],
    fail: [],
    minScore: 10,
  },
  "messy-two-page.pdf": {
    pass: [],
    fail: ["length", "margins", "fonts", "bodySize", "name", "headers", "dates", "bullets", "bulletsPerEntry", "sectionOrder", "contact", "graphics"],
    maxScore: 5,
  },
  "junior-short.pdf": {
    pass: ["length", "margins", "fonts", "name", "headers", "dates", "bullets", "sectionOrder", "contact", "graphics"],
    fail: ["pageFill"],
  },
};

async function main() {
  let failures = 0;
  for (const [file, exp] of Object.entries(EXPECT)) {
    const r = await runFormatChecks(new Uint8Array(readFileSync(path.join(DIR, file))));
    const again = await runFormatChecks(new Uint8Array(readFileSync(path.join(DIR, file))));
    console.log(`\n${file}  score ${r.score}/10  pages ${r.pages}`);
    for (const c of r.checks) console.log(`  ${c.pass === null ? "–" : c.pass ? "✓" : "✗"} ${c.label}: ${c.message}`);
    const bad = (msg: string) => {
      failures++;
      console.log(`  FAIL ${msg}`);
    };
    for (const id of exp.pass) if (r.checks.find((c) => c.id === id)?.pass !== true) bad(`${id} should pass`);
    for (const id of exp.fail) if (r.checks.find((c) => c.id === id)?.pass !== false) bad(`${id} should fail`);
    if (exp.maxScore !== undefined && r.score > exp.maxScore) bad(`score ${r.score} > ${exp.maxScore}`);
    if (exp.minScore !== undefined && r.score < exp.minScore) bad(`score ${r.score} < ${exp.minScore}`);
    if (again.score !== r.score) bad("score changed between two runs");
  }
  console.log(failures ? `\n${failures} failure(s)` : "\nAll formatting checks match.");
  process.exit(failures ? 1 : 0);
}
void main();
