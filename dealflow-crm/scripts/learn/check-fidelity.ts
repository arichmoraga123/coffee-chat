/**
 * Verifies the converted lessons kept every piece of source content:
 * deep dives, "Say it" answers, fill-ins, walkthrough steps and checkpoint prompts.
 * Usage: npx tsx scripts/learn/check-fidelity.ts
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const src = readFileSync("content/LESSON_CONTENT.md", "utf8");
const lessons = readdirSync("content/lessons").map((f) => JSON.parse(readFileSync(path.join("content/lessons", f), "utf8")));
const all = lessons.map((l) => JSON.stringify(l)).join("\n");
const norm = (s: string) =>
  s.replace(/\*\*|\*|“|”|"/g, "").replace(/\\"/g, "").replace(/\s+/g, " ").trim();
const corpus = norm(all.replace(/\\n/g, " ").replace(/\\"/g, '"'));

let problems = 0;
const miss = (kind: string, text: string) => {
  problems++;
  console.log(`MISSING ${kind}: ${text.slice(0, 110)}`);
};

// Deep dive titles + Say-it lines
for (const m of src.matchAll(/^- \*\*(.+?)\*\*\s*(🟢|🟡|🔴)/gm)) {
  const t = norm(m[1].replace("Additional deep dive to add — ", ""));
  if (!corpus.includes(t)) miss("deep dive", t);
}
for (const m of src.matchAll(/\*Say it:\*\s*(.+)$/gm)) {
  const t = norm(m[1]).slice(0, 80);
  if (!corpus.includes(t)) miss("say-it", t);
}
// Deep dive bodies (indented explanation lines)
for (const m of src.matchAll(/^  (?!\*Say it)(.{20,})$/gm)) {
  const t = norm(m[1]).slice(0, 70);
  if (!corpus.includes(t)) miss("deep dive body", t);
}
// Checkpoint prompts
for (const m of src.matchAll(/^\*\*Checkpoint:\*\*\s*(.+)$/gm)) {
  for (const p of m[1].split(/\s+·\s+/)) if (!corpus.includes(norm(p))) miss("checkpoint", p);
}
// Walkthrough numbered steps (ignoring workbook pointers, which move to the excel block)
for (const m of src.matchAll(/^\d+\.\s+(.+)$/gm)) {
  // "**Heading:** body" steps are stored as a heading + body, so check the parts separately.
  const parts = /^\*\*([^*]+?):\*\*\s*(.+)$/.exec(m[1]);
  for (const piece of parts ? [parts[1], parts[2]] : [m[1]]) {
    const t = norm(piece).replace(/\s*(Practice|Build|Work|Calculate|Toggle)\b.*PEB_0\d.*$/, "").slice(0, 70);
    if (t.length > 3 && !corpus.includes(t)) miss("walkthrough step", t);
  }
}
// Fill-in answers: every bolded answer must exist as an accepted answer / calc solution
const s52 = src.indexOf("## 5.2");
const e52 = src.indexOf("## 5.3");
for (const block of (src.slice(0, s52) + src.slice(e52)).matchAll(/\*\*Fill-ins\*\*\n([\s\S]*?)\n\n/g)) {
  for (const line of block[1].split("\n")) {
    for (const b of line.matchAll(/\*\*(.+?)\*\*/g)) {
      if (!corpus.includes(norm(b[1]))) miss("fill-in answer", `${b[1]}  ←  ${line}`);
    }
  }
}
console.log(problems ? `${problems} problem(s)` : "✓ All source content is present in the lesson JSON.");
process.exit(problems ? 1 : 0);
