/**
 * npm run test-openings-import — the openings template uploads with zero errors and 11 openings,
 * and a tracker-style CSV maps its headers automatically.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileToTabs } from "../src/lib/sheet-rows";
import { parseOpeningTabs } from "../src/lib/openings-parse";
import { openingKey, openingStatus, parseDateCell } from "../src/lib/openings";

let fails = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) fails++;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok || !detail ? "" : ` — ${detail}`}`);
};

async function main() {
  const file = path.join(process.cwd(), "public/templates/Prospect_Recruiting_Openings_Template.xlsx");
  const buf = readFileSync(file);
  const tabs = await fileToTabs({ name: "template.xlsx", arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer });
  const r = parseOpeningTabs(tabs);
  check("template: zero errors", r.errors.length === 0, JSON.stringify(r.errors));
  check("template: 10 rows read", r.rowsRead === 10, String(r.rowsRead));
  check("template: 11 openings (one row has two cities)", r.openings.length === 11, String(r.openings.length));
  check("template: no out-of-list values", r.warnings.length === 0, JSON.stringify(r.warnings));
  const keys = new Set(r.openings.map((o) => openingKey({ ...o, clubId: "club" })));
  check("template: keys are unique", keys.size === r.openings.length);
  const ng = r.openings.filter((o) => o.firmName === "Northgate Securities" && o.program === "2027 Summer Analyst");
  check("template: New York; Chicago split", ng.map((o) => o.city).join(",") === "New York,Chicago");
  const rx = r.openings.find((o) => o.program === "2027 Restructuring Summer Analyst");
  check("template: rolling deadline stays blank", rx?.deadline === null && rx?.deadlineType === "Rolling");
  const hp = r.openings.find((o) => o.program === "2027 Investment Banking Summer Analyst");
  check("template: dates read exactly", hp?.opensOn?.toISOString().slice(0, 10) === "2026-10-15" && hp?.deadline?.toISOString().slice(0, 10) === "2026-11-15");
  const sr = r.openings.find((o) => o.firmName === "Summit Ridge Partners");
  check("template: Status column overrides", sr?.statusOverride === "Not yet open");
  check("template: class years", JSON.stringify(r.openings.find((o) => o.firmName === "Ridgeway Growth Equity")?.classYears) === '["Sophomore","Junior"]');

  const csv = [
    "Company,Role,Location,Opening date,Closing date,Link,Category,Year",
    'Acme Capital,2027 IB Summer Analyst,"Boston / Detroit",2026-09-01,Nov 15 2026,acme.example/jobs,Investment Banking,Junior',
    "Beta Partners,Credit Analyst Intern,Chicago,TBC,Rolling,https://beta.example,Private Credit,Sophomore; Junior",
    "Gamma LLC,Analyst,Chicago,10/01/2026,next week,,,",
  ].join("\n");
  const c = parseOpeningTabs(await fileToTabs({ name: "tracker.csv", arrayBuffer: async () => new TextEncoder().encode(csv).buffer as ArrayBuffer }));
  check("tracker CSV: headers map automatically", c.headerProblems.length === 0 && c.tabsUsed.length === 1, c.headerProblems.join("; "));
  check("tracker CSV: 3 openings from 2 good rows", c.openings.length === 3, String(c.openings.length));
  check("tracker CSV: unreadable date is an error, not a guess", c.errors.length === 1 && /next week/.test(c.errors[0].reason), JSON.stringify(c.errors));
  check("tracker CSV: track alias", c.openings[0]?.track === "IB" && c.openings[2]?.track === "Private Credit");
  check("tracker CSV: link gets https", c.openings[0]?.link === "https://acme.example/jobs");
  check("tracker CSV: Rolling closing date", c.openings[2]?.deadline === null && c.openings[2]?.deadlineType === "Rolling");

  check("dates: Nov 15, 2026", parseDateCell("Nov 15, 2026").date?.toISOString().slice(0, 10) === "2026-11-15");
  check("dates: N/A → unknown", parseDateCell("N/A").kind === "unknown");
  const base = { deadlineType: "Fixed", statusOverride: null };
  check("status: before opens", openingStatus({ ...base, opensOn: "2026-12-01", deadline: "2026-12-20" }, "2026-11-02") === "Not yet open");
  check("status: after deadline", openingStatus({ ...base, opensOn: null, deadline: "2026-10-01" }, "2026-11-02") === "Closed");
  check("status: open", openingStatus({ ...base, opensOn: "2026-10-01", deadline: "2026-11-02" }, "2026-11-02") === "Open");
  check("status: rolling, no dates", openingStatus({ opensOn: null, deadline: null, deadlineType: "Rolling", statusOverride: null }) === "Open");
  check("status: unknown, no dates", openingStatus({ opensOn: null, deadline: null, deadlineType: "Unknown", statusOverride: null }) === "Unknown");

  console.log(fails ? `\n${fails} failed` : "\nOpenings upload checks pass.");
  process.exit(fails ? 1 : 0);
}
void main();
