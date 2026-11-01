/**
 * Phase I check: runs the Rolodex importer's planner on the template and sample files for a throwaway user,
 * commits, re-imports (everything should be skipped), then deletes the throwaway user.
 * Usage: npx tsx scripts/test-import.ts
 */
import { readFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { fileToTabs } from "@/lib/sheet-rows";
import { commitImport, parseDate, planImport, type ImportInput } from "@/lib/rolodex-import";

let failed = 0;
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${msg}`);
  if (!ok) failed++;
};
const load = (path: string) => fileToTabs({ name: path, arrayBuffer: async () => new Uint8Array(readFileSync(path)).buffer });

async function main() {
  check(parseDate("2026-10-14")?.toISOString().slice(0, 10) === "2026-10-14", "ISO date");
  check(parseDate("10/14/2026")?.toISOString().slice(0, 10) === "2026-10-14", "US date");
  check(parseDate("14 Oct 2026")?.toISOString().slice(0, 10) === "2026-10-14", "LinkedIn date");
  check(parseDate("46309")?.toISOString().slice(0, 10) === "2026-10-14", "Excel serial");
  check(parseDate("sometime in fall") === null && parseDate("") === null && parseDate("2026-02-30") === null, "bad dates rejected");

  const user = await prisma.user.create({ data: { email: `import-test-${Date.now()}@test.local`, name: "Import test", passwordHash: "x" } });
  try {
    await prisma.firm.create({ data: { name: "Halvorsen and Pike", type: "IB", location: "", focus: "", userId: user.id } });
    const tabs = await load("public/templates/Prospect_Rolodex_Import_Template.xlsx");
    check(tabs.map((t) => t.name).join(",") === "Contacts,Interactions", `template tabs: ${tabs.map((t) => t.name).join(",")}`);
    const input: ImportInput = { source: "rolodex_template", fileName: "template.xlsx", tabs };
    const plan = await planImport(user.id, input);
    const c = plan.preview.counts;
    console.log(JSON.stringify(c), "suggestions:", JSON.stringify(plan.preview.firmSuggestions), plan.preview.errors.map((e) => `${e.tab}:${e.row} ${e.reason}`));
    check(c.contactsNew >= 10, "creates the template contacts");
    check(c.interactions >= 10, "creates the template interactions");
    check(plan.preview.firmSuggestions.some((s) => s.from === "Halvorsen & Pike" && s.to === "Halvorsen and Pike") || plan.preview.newFirms.every((f) => f !== "Halvorsen & Pike"), "Halvorsen & Pike matched or suggested");
    const withMerge = await planImport(user.id, { ...input, acceptSuggestions: true });
    check(!withMerge.preview.newFirms.includes("Halvorsen & Pike"), "accepting suggestions reuses the existing firm");
    const { batchId } = await commitImport(user.id, { ...input, acceptSuggestions: true }, withMerge);
    const maya = await prisma.contact.findFirst({ where: { userId: user.id, fullName: "Maya Chen" }, include: { interactions: true, firm: true } });
    check(Boolean(maya), "Maya imported");
    check(maya?.firm.name === "Halvorsen and Pike", "Maya on merged firm");
    check(maya?.lastInteractionDate?.toISOString().slice(0, 10) === maya?.interactions.map((i) => i.date.toISOString().slice(0, 10)).sort().at(-1), "last contacted = latest interaction");
    check(maya?.relationshipStage === "Chatted", `Maya stage from column: ${maya?.relationshipStage}`);
    const ethan = await prisma.contact.findFirst({ where: { userId: user.id, fullName: "Ethan Brooks" } });
    check(ethan?.lastInteractionDate === null, "no interactions → never contacted");
    const steps = await prisma.task.count({ where: { userId: user.id, ruleKey: { startsWith: "step:" } } });
    console.log("earlier next-step tasks:", steps);
    const again = await planImport(user.id, input);
    check(again.preview.counts.contactsNew === 0 && again.preview.counts.contactsUpdated === 0 && again.preview.counts.interactions === 0, `re-import is a no-op: ${JSON.stringify(again.preview.counts)}`);
    // Sample CSVs, as two files.
    const csvTabs = [...(await load("public/templates/prospect-contacts-sample.csv")), ...(await load("public/templates/prospect-interactions-sample.csv"))];
    const csvPlan = await planImport(user.id, { source: "rolodex_template", fileName: "samples", tabs: csvTabs });
    check(csvPlan.preview.counts.contactsNew === 0 && csvPlan.preview.counts.interactions === 0, `CSV samples match the same people: ${JSON.stringify(csvPlan.preview.counts)}`);
    // Bad rows.
    const bad = await planImport(user.id, {
      source: "rolodex_template",
      fileName: "bad.csv",
      tabs: [
        { name: "Contacts", rows: [["First Name", "Last Name", "Company", "Position"], ["Zed", "Quinn", "Halvorsen and Pike LLC", "Analyst"], ["No", "Firm", "", ""]] },
        { name: "Interactions", rows: [["First Name", "Last Name", "Firm", "Date", "Type", "Summary"], ["Zed", "Quinn", "Halvorsen and Pike LLC", "", "Coffee chat", "x"], ["Zed", "Quinn", "Halvorsen and Pike LLC", "2026-10-01", "Coffee Chat", "y"]] },
      ],
    });
    check(bad.preview.errors.some((e) => /Missing Date/.test(e.reason)), "missing date is an error");
    check(bad.preview.errors.some((e) => /Missing Firm/.test(e.reason)), "missing firm is an error");
    check(bad.preview.suggestions.some((s) => s.value === "Coffee Chat" && s.suggestion === "Coffee chat"), "Coffee Chat → Coffee chat suggestion");
    check(!bad.preview.newFirms.length, "Halvorsen and Pike LLC normalizes to the existing firm");
    // LinkedIn export with note rows.
    const li = await planImport(user.id, {
      source: "linkedin",
      fileName: "Connections.csv",
      tabs: [{ name: "Connections", rows: [["Notes:"], ["When exporting your connection data..."], [""], ["First Name", "Last Name", "URL", "Email Address", "Company", "Position", "Connected On"], ["Ana", "Ruiz", "https://www.linkedin.com/in/ana-ruiz/", "", "Northgate Securities", "Analyst", "14 Oct 2026"], ["Bo", "Li", "", "", "", "Student", "01 Jan 2026"]] }],
    });
    check(li.preview.counts.contactsNew === 1 && li.preview.newContacts[0].list === "network" && li.preview.counts.interactions === 0, "LinkedIn → Network, no interactions");
    check(li.contacts[0]?.data.connectedOn instanceof Date, "Connected On stored on the contact");
    console.log("batch", batchId);
  } finally {
    await prisma.user.delete({ where: { id: user.id } });
  }
  console.log(failed ? `${failed} FAILED` : "all passed");
  process.exit(failed ? 1 : 0);
}
void main();
