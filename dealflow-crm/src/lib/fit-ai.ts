import "server-only";
import { z } from "zod";
import { anthropicJson } from "@/lib/anthropic";
import { genericFlags, speakingSeconds, targetSeconds, WORDS_PER_MINUTE, type FitQuestion } from "@/lib/fit";

/** F2.3: put in the system prompt verbatim. */
export const FIT_AI_RULES = `1. Use only facts the student provided in the builder, their linked stories, or their logged interactions. Never invent experiences, names, numbers, or deals.
2. If something important is missing, write [ADD: …] instead of making it up.
3. Keep their voice: plain, first person, no corporate filler.
4. Stay within the target length (about 150 words per 60 seconds).
5. Grade at the student's class-year level (same setting as the resume reviewer). Freshmen aren't expected to have deal experience.`;

export type FitSources = {
  question: FitQuestion;
  prompt: string;
  level: string;
  builder: Record<string, string>;
  stories: { title: string; text: string }[];
  interactions: { date: string; contact: string; firm: string; firstLine: string }[];
  draft?: string;
};

function sourceBlock(s: FitSources): string {
  const builder = s.question.builderFields
    .map((f) => `- ${f.label}: ${(s.builder[f.key] ?? "").trim() || "(blank)"}`)
    .join("\n");
  const stories = s.stories.length ? s.stories.map((st) => `- ${st.title}: ${st.text.slice(0, 1500)}`).join("\n") : "(none linked)";
  const people = s.interactions.length ? s.interactions.map((i) => `- ${i.date}, ${i.contact} (${i.firm}): ${i.firstLine}`).join("\n") : "(none included)";
  const t = targetSeconds(s.question);
  return `Question: ${s.prompt}
Student level: ${s.level}
Target length: ${s.question.targetLengthSeconds} seconds${t ? ` (about ${Math.round((t.min / 60) * WORDS_PER_MINUTE)}–${Math.round((t.max / 60) * WORDS_PER_MINUTE)} words)` : ""}
What the interviewer is testing: ${s.question.whatTheyreTesting}
Framework: ${s.question.framework.map((f, i) => `${i + 1}. ${f}`).join(" ")}
Must include: ${s.question.mustInclude.join("; ")}
Avoid: ${s.question.avoid.join("; ")}

Builder answers:
${builder}

Linked stories:
${stories}

Conversations they logged:
${people}`;
}

const SYSTEM = (task: string) => `You help a college student prepare spoken answers to behavioral ("fit") interview questions for investment banking and finance roles. ${task}

Rules (follow exactly):
${FIT_AI_RULES}`;

const str = { type: "string" };
const obj = (properties: Record<string, unknown>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });

export async function improveDraft(userId: string, s: FitSources): Promise<{ draft: string; missing: string[] }> {
  const schema = obj({ draft: str, missing: { type: "array", items: str } });
  const out = await anthropicJson<{ draft: string; missing: string[] }>(
    `${sourceBlock(s)}

${s.draft?.trim() ? `Their current draft:\n${s.draft}\n\n` : ""}Write the answer as they would say it out loud, following the framework. List in "missing" anything important you had to mark with [ADD: …].`,
    schema,
    { system: SYSTEM("Write an improved draft of their answer."), maxTokens: 4000, effort: "low", usageLog: { userId, feature: "fit-answer" } },
  );
  return z.object({ draft: z.string(), missing: z.array(z.string()).default([]) }).parse(out);
}

const Feedback = z.object({
  scores: z.object({
    structure: z.object({ score: z.number().int().min(1).max(5), comment: z.string() }),
    specificity: z.object({ score: z.number().int().min(1).max(5), comment: z.string() }),
    authenticity: z.object({ score: z.number().int().min(1).max(5), comment: z.string() }),
    length: z.object({ score: z.number().int().min(1).max(5), comment: z.string() }),
    fit: z.object({ score: z.number().int().min(1).max(5), comment: z.string() }),
  }),
  flags: z.array(z.object({ quote: z.string(), suggestion: z.string() })).default([]),
  mustInclude: z.array(z.object({ item: z.string(), present: z.boolean(), note: z.string().default("") })).default([]),
  summary: z.string().default(""),
});
export type FitFeedback = z.infer<typeof Feedback> & { seconds: number; words: number; level: string };

export async function feedbackOn(userId: string, s: FitSources & { draft: string }): Promise<FitFeedback> {
  const score = obj({ score: { type: "integer", description: "1–5" }, comment: str });
  const schema = obj({
    scores: obj({ structure: score, specificity: score, authenticity: score, length: score, fit: score }),
    flags: { type: "array", items: obj({ quote: str, suggestion: str }) },
    mustInclude: { type: "array", items: obj({ item: str, present: { type: "boolean" }, note: str }) },
    summary: str,
  });
  const seconds = speakingSeconds(s.draft);
  const raw = await anthropicJson<unknown>(
    `${sourceBlock(s)}

Their draft (about ${seconds} seconds spoken):
${s.draft}

Score 1–5 for Structure, Specificity, Authenticity, Length, and Fit to the question, each with a one-sentence comment.
flags: quote exact phrases from the draft that match the Avoid list or are generic ("fast-paced environment", "I want to learn a lot", "collaborative culture"), each with a specific replacement suggestion that uses only their own facts.
mustInclude: one entry per must-include item, present true/false, with a short note.
summary: one or two sentences, direct and encouraging.`,
    schema,
    { system: SYSTEM("Give feedback on their draft."), maxTokens: 4000, effort: "low", usageLog: { userId, feature: "fit-answer" } },
  );
  const fb = Feedback.parse(raw);
  // Always flag the common generic lines, even if the model missed one.
  const have = new Set(fb.flags.map((f) => f.quote.toLowerCase()));
  for (const g of genericFlags(s.draft)) if (![...have].some((h) => h.includes(g.quote.toLowerCase()))) fb.flags.push(g);
  // Every must-include item gets a row, in the question's order.
  const byItem = new Map(fb.mustInclude.map((m) => [m.item.toLowerCase(), m]));
  fb.mustInclude = s.question.mustInclude.map((item) => byItem.get(item.toLowerCase()) ?? fb.mustInclude.find((m) => item.toLowerCase().includes(m.item.toLowerCase().slice(0, 20))) ?? { item, present: false, note: "" });
  return { ...fb, seconds, words: s.draft.trim().split(/\s+/).filter(Boolean).length, level: s.level };
}
