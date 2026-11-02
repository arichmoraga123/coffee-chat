/**
 * Calibration: grades every resume in scripts/fixtures/resumes/calibration.json twice and reports any
 * score outside its expected range, or two runs more than 0.5 apart. Needs ANTHROPIC_API_KEY.
 * npm run test-resume-grader
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { runFormatChecks } from "../src/lib/resume/format-checks";
import { gradeResume, type AiCaller } from "../src/lib/resume/grader";
import type { ClassLevel, RecruitingTarget } from "../src/lib/resume/rubric";

type Case = { file: string; level: ClassLevel; target: RecruitingTarget; note: string; min?: number; max?: number; formattingMax?: number };
const DIR = path.join(__dirname, "fixtures", "resumes");

async function main() {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key) {
    console.log("ANTHROPIC_API_KEY is not set — skipping the calibration run.");
    return;
  }
  const client = new Anthropic({ apiKey: key, maxRetries: 2, timeout: 180_000 });
  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-opus-5-5";
  const call: AiCaller = async ({ system, content, schema }) => {
    const msg = await client.beta.messages.create({
      model,
      max_tokens: 12000,
      system,
      messages: [{ role: "user", content: content as never }],
      output_config: { effort: "low", format: { type: "json_schema", schema } },
    } as never);
    const text = (msg as { content: Array<{ type: string; text?: string }> }).content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    return JSON.parse(text);
  };

  const cases = JSON.parse(readFileSync(path.join(DIR, "calibration.json"), "utf8")) as Case[];
  let failures = 0;
  for (const c of cases) {
    const pdf = new Uint8Array(readFileSync(path.join(DIR, c.file)));
    const format = await runFormatChecks(pdf);
    const runs = [];
    for (let i = 0; i < 2; i++) runs.push(await gradeResume({ level: c.level, target: c.target, experience: [], pdf, format }, call));
    const [a, b] = runs.map((r) => r.overall);
    const problems: string[] = [];
    if (c.min !== undefined && a < c.min) problems.push(`score ${a} < ${c.min}`);
    if (c.max !== undefined && a > c.max) problems.push(`score ${a} > ${c.max}`);
    if (c.formattingMax !== undefined && format.score > c.formattingMax) problems.push(`formatting ${format.score} > ${c.formattingMax}`);
    if (Math.abs(a - b) > 0.5) problems.push(`runs differ: ${a} vs ${b}`);
    failures += problems.length ? 1 : 0;
    console.log(`${problems.length ? "✗" : "✓"} ${c.file} (${c.note}) — ${a} / ${b}, formatting ${format.score}${problems.length ? `  ${problems.join("; ")}` : ""}`);
  }
  console.log(failures ? `\n${failures} resume(s) outside the expected range.` : "\nCalibration set passes.");
  process.exit(failures ? 1 : 0);
}
void main();
