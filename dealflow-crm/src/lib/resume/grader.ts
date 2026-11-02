/**
 * Resume reviewer v2: prompt, structured-output schema, validation and final scoring.
 * The AI call itself is passed in, so the API route and the calibration script share everything else.
 * No server-only imports.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  AI_CATEGORY_NAMES,
  CATEGORIES,
  EXPERIENCE_OPTIONS,
  GRADING_RULES,
  RUBRIC_WEIGHTS,
  TARGET_FOCUS,
  categoryKeyOf,
  overallScore,
  scoreBand,
  type CategoryKey,
  type ClassLevel,
  type ExperienceId,
  type RecruitingTarget,
} from "./rubric";
import type { FormatResult } from "./format-checks";

const str = { type: "string" };
const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

/** JSON schema the API enforces on the reply. */
export const AI_REVIEW_SCHEMA = obj({
  categories: {
    type: "array",
    items: obj({
      name: { type: "string", enum: AI_CATEGORY_NAMES },
      score: { type: "integer", description: "0-10, relative to a strong resume at this level" },
      summary: str,
      evidence: { type: "array", items: str, description: "Exact quotes from the resume" },
    }),
  },
  bullets: {
    type: "array",
    items: obj({
      section: str,
      original: str,
      issues: { type: "array", items: str },
      rewrite: str,
      rating: { type: "string", enum: ["strong", "ok", "weak"] },
    }),
  },
  strengths: { type: "array", items: str },
  topFixes: { type: "array", items: str },
  levelNote: str,
});

const AiReview = z.object({
  categories: z
    .array(
      z.object({
        name: z.string(),
        score: z.number(),
        summary: z.string(),
        evidence: z.array(z.string()).default([]),
      }),
    )
    .min(1),
  bullets: z
    .array(
      z.object({
        section: z.string().default(""),
        original: z.string(),
        issues: z.array(z.string()).default([]),
        rewrite: z.string().default(""),
        rating: z.enum(["strong", "ok", "weak"]),
      }),
    )
    .default([]),
  strengths: z.array(z.string()).default([]),
  topFixes: z.array(z.string()).default([]),
  levelNote: z.string().default(""),
});
export type AiReview = z.infer<typeof AiReview>;

export type GradeInput = {
  level: ClassLevel;
  target: RecruitingTarget;
  experience: ExperienceId[];
  /** PDF bytes (full grading) or plain text (content only, e.g. from a .docx). */
  pdf?: Uint8Array;
  text?: string;
  /** Formatting checks; absent for content-only grading. */
  format?: FormatResult | null;
};

export type CategoryResult = {
  key: CategoryKey;
  name: string;
  weight: number;
  score: number | null;
  summary: string;
  evidence: string[];
};

export type ReviewV2 = {
  version: 2;
  level: ClassLevel;
  target: RecruitingTarget;
  experience: ExperienceId[];
  overall: number;
  band: string;
  contentOnly: boolean;
  formatting: { score: number; pages: number; checks: FormatResult["checks"] } | null;
  categories: CategoryResult[];
  bullets: AiReview["bullets"];
  strengths: string[];
  topFixes: string[];
  levelNote: string;
};

export type AiCaller = (args: {
  system: string;
  content: Array<Record<string, unknown>>;
  schema: Record<string, unknown>;
}) => Promise<unknown>;

const EXEMPLAR_DIR = path.join(process.cwd(), "content", "resume-exemplars");

/** Strips emails, phone numbers and URLs as a safety net (exemplars should already be de-identified). */
export function deidentify(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]")
    .replace(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, "[phone]")
    .replace(/(https?:\/\/)?(www\.)?linkedin\.com\/\S*/gi, "[linkedin]");
}

/** Up to 3 strong example resumes for this level, from content/resume-exemplars/[level]/ (.txt or .md). */
export function loadExemplars(level: ClassLevel): string[] {
  const dir = path.join(EXEMPLAR_DIR, level.toLowerCase());
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.(txt|md)$/i.test(f))
    .sort()
    .slice(0, 3)
    .map((f) => deidentify(readFileSync(path.join(dir, f), "utf8")).slice(0, 6000));
}

export function buildSystemPrompt(input: GradeInput, exemplars: string[]): string {
  const w = RUBRIC_WEIGHTS[input.level];
  const weights = CATEGORIES.map((c) => `- ${c.name}: ${w[c.key]} — ${c.measures}`).join("\n");
  const exp = input.experience.length
    ? EXPERIENCE_OPTIONS.filter((o) => input.experience.includes(o.id)).map((o) => o.label).join(", ")
    : "not given";
  const fmt = input.format
    ? input.format.checks
        .map((c) => `- ${c.label}: ${c.pass === null ? "not measured" : c.pass ? "PASS" : "FAIL"} — ${c.message}`)
        .join("\n")
    : "Not measured (the file isn't a PDF). Don't comment on visual layout; grade content only.";

  return `You review resumes for college students recruiting for finance and business roles.

Student level: ${input.level}
Recruiting for: ${input.target} — ${TARGET_FOCUS[input.target]}
Experience the student says they have so far: ${exp}

Rubric weights for a ${input.level} (out of 100):
${weights}

Grading rules (follow exactly):
${GRADING_RULES}

Formatting checks, measured in code from the PDF (already final — don't contradict them and don't score formatting):
${fmt}

How to answer:
- Score each of these categories 0–10, relative to a strong ${input.level} resume: ${AI_CATEGORY_NAMES.join("; ")}.
- For each category: a 1–2 sentence summary and 1–3 exact quotes from the resume as evidence.
- bullets: every bullet on the resume, in order, quoted exactly. rating is strong, ok or weak. issues are short labels like "no result", "weak verb", "vague", "not quantified", "too long", "tense". rewrite keeps every fact and uses [X] placeholders where a number would help; for strong bullets, rewrite may repeat the original.
- strengths: 2–3 things that are already strong, specific to this resume.
- topFixes: exactly 3, ordered by impact, each concrete (what to change and how).
- levelNote: one sentence on how this compares to a strong ${input.level} resume.
- Tone: direct and encouraging. Never say "unfortunately" and don't lecture. Every negative comes with a fix.${
    exemplars.length
      ? `\n\nStrong ${input.level} resumes for calibration (de-identified). Resumes at this standard score 8–10:\n${exemplars
          .map((e, i) => `--- Example ${i + 1} ---\n${e}`)
          .join("\n\n")}`
      : ""
  }`;
}

export function buildUserContent(input: GradeInput): Array<Record<string, unknown>> {
  const blocks: Array<Record<string, unknown>> = [];
  if (input.pdf) {
    blocks.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: Buffer.from(input.pdf).toString("base64") },
    });
  } else {
    blocks.push({ type: "text", text: `Resume text:\n\n${(input.text ?? "").slice(0, 20000)}` });
  }
  blocks.push({ type: "text", text: `Grade this resume at the ${input.level} level for ${input.target}.` });
  return blocks;
}

/** Validates the AI reply and computes the final review (overall score is computed here, not by the AI). */
export function finalizeReview(input: GradeInput, raw: unknown): ReviewV2 {
  const ai = AiReview.parse(raw);
  const w = RUBRIC_WEIGHTS[input.level];
  const byKey = new Map<CategoryKey, AiReview["categories"][number]>();
  for (const c of ai.categories) {
    const key = categoryKeyOf(c.name);
    if (key && key !== "formatting" && !byKey.has(key)) byKey.set(key, c);
  }
  const fmt = input.format ?? null;
  const categories: CategoryResult[] = CATEGORIES.map((c) => {
    if (c.key === "formatting") {
      const failed = fmt?.checks.filter((k) => k.pass === false) ?? [];
      return {
        key: c.key,
        name: c.name,
        weight: w[c.key],
        score: fmt ? fmt.score : null,
        summary: !fmt
          ? "Export to PDF to check formatting."
          : failed.length
            ? `${failed.length} of ${fmt.checks.filter((k) => k.pass !== null).length} layout checks need a fix: ${failed.map((k) => k.label.toLowerCase()).join(", ")}.`
            : "Every layout check passed.",
        evidence: failed.map((k) => k.message),
      };
    }
    const a = byKey.get(c.key);
    return {
      key: c.key,
      name: c.name,
      weight: w[c.key],
      score: a ? Math.max(0, Math.min(10, Math.round(a.score * 2) / 2)) : null,
      summary: a?.summary ?? "Not graded.",
      evidence: a?.evidence ?? [],
    };
  });
  const scores: Partial<Record<CategoryKey, number>> = {};
  for (const c of categories) if (c.score !== null) scores[c.key] = c.score;
  const overall = overallScore(input.level, scores);
  return {
    version: 2,
    level: input.level,
    target: input.target,
    experience: input.experience,
    overall,
    band: scoreBand(overall).label,
    contentOnly: !fmt,
    formatting: fmt ? { score: fmt.score, pages: fmt.pages, checks: fmt.checks } : null,
    categories,
    bullets: ai.bullets,
    strengths: ai.strengths.slice(0, 3),
    topFixes: ai.topFixes.slice(0, 3),
    levelNote: ai.levelNote,
  };
}

export async function gradeResume(input: GradeInput, call: AiCaller): Promise<ReviewV2> {
  const system = buildSystemPrompt(input, loadExemplars(input.level));
  const raw = await call({ system, content: buildUserContent(input), schema: AI_REVIEW_SCHEMA });
  return finalizeReview(input, raw);
}

/** Text of a .docx (word/document.xml), paragraph per line. */
export function docxText(documentXml: string): string {
  return documentXml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
