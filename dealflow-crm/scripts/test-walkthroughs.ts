/**
 * Phase M.4: for every walkthrough, load the student workbook, enter each step's expected formula (or value) in
 * order with our formula engine, and check the result is within tolerance.
 *
 * Student files are not in git. Put them in content/private/workbooks-v2/ (or set WORKBOOKS_DIR). In a build without
 * them the script says so and exits 0, unless REQUIRE_WORKBOOKS=1.
 * Usage: npm run test-walkthroughs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Workbook, isErr, functionsIn, SUPPORTED } from "../src/lib/formula/engine";
import { sheetsFromXlsx } from "../src/lib/formula/load-xlsx";
import { matches, type Walkthrough } from "../src/lib/walkthroughs";

const dir = process.env.WORKBOOKS_DIR ?? path.join(process.cwd(), "content/private/workbooks-v2");
const walkDir = path.join(process.cwd(), "content/walkthroughs");
const files = readdirSync(walkDir).filter((f) => f.endsWith(".walkthrough.json")).sort();

// Every function used anywhere must be supported, files or not.
const unsupported = new Set<string>();
for (const f of files) {
  const w = JSON.parse(readFileSync(path.join(walkDir, f), "utf8")) as Walkthrough;
  for (const s of w.steps) for (const fn of s.expectedFormula ? functionsIn(s.expectedFormula) : []) if (!SUPPORTED.includes(fn)) unsupported.add(fn);
}
if (unsupported.size) {
  console.error(`Unsupported functions in walkthroughs: ${[...unsupported].join(", ")}`);
  process.exit(1);
}

if (!existsSync(dir)) {
  console.log(`test-walkthroughs: no student workbooks at ${dir}; checked functions only (${files.length} walkthroughs). Set WORKBOOKS_DIR to run the full check.`);
  process.exit(process.env.REQUIRE_WORKBOOKS === "1" ? 1 : 0);
}

let failed = 0;
let total = 0;
for (const f of files) {
  const w = JSON.parse(readFileSync(path.join(walkDir, f), "utf8")) as Walkthrough;
  const file = path.join(dir, w.studentFile);
  if (!existsSync(file)) {
    console.log(`MISSING ${w.studentFile}`);
    failed++;
    continue;
  }
  const wb = new Workbook(sheetsFromXlsx(readFileSync(file)));
  let bad = 0;
  for (const s of w.steps) {
    total++;
    if (s.kind === "formula" || s.kind === "formula-text") {
      wb.set(s.sheet, s.cell, { f: s.expectedFormula! });
      const v = wb.get(s.sheet, s.cell);
      if (!matches(s, v)) {
        bad++;
        if (bad <= 5) console.log(`  FAIL ${w.workbookKey} ${s.id} ${s.sheet}!${s.cell} ${s.expectedFormula} → ${isErr(v) ? v.error : JSON.stringify(v)} (expected ${JSON.stringify(s.expectedValue)} ± ${s.tolerance ?? "-"})`);
      }
    } else if (s.kind === "value" || s.kind === "choice" || s.kind === "text") {
      wb.set(s.sheet, s.cell, { v: s.expectedValue as number | string });
    }
  }
  console.log(`${bad ? "FAIL" : "ok  "} ${w.workbookKey}: ${w.steps.length - bad}/${w.steps.length}`);
  failed += bad;
}
console.log(failed ? `${failed} step(s) failed of ${total}` : `all ${total} steps passed`);
process.exit(failed ? 1 : 0);
