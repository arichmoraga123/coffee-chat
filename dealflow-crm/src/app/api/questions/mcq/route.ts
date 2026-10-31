import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { anthropicJson, getAnthropicApiKey } from "@/lib/anthropic";
import { getAuthoredMcq, type DrillMcq } from "@/lib/drill-mcq";

export const maxDuration = 60;

/** Per-instance cache: generated choices keyed by question id + last update. */
const cache = new Map<string, DrillMcq>();
const MAX_IDS = 12;

const str = { type: "string" };
const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: str,
          correct: str,
          distractors: { type: "array", items: str },
          why: str,
        },
        required: ["id", "correct", "distractors", "why"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

const SYSTEM = `You write multiple-choice drills for finance recruiting (investment banking, PE, consulting, markets).
For each question, write ONE correct answer and THREE "near-miss" distractors:
- Each distractor mirrors the correct answer's structure and length but changes ONE key detail (a sign, direction, number, ordering, or term) so it becomes wrong.
- Distractors must be plausible to a candidate who half-knows the material — never obviously silly, never from a different topic.
- All four options must be similar in length (within ~20%) so length never gives away the answer.
- Max ~220 characters per option. No "all of the above".
- "why" is one sentence naming the trap the distractors exploit.`;

/** POST { ids: string[] } → { mcqs: Record<questionId, DrillMcq> } */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { ids?: unknown };
  const ids = Array.isArray(body.ids) ? body.ids.filter((x): x is string => typeof x === "string").slice(0, MAX_IDS) : [];
  if (!ids.length) return NextResponse.json({ mcqs: {} });

  const rows = await prisma.question.findMany({
    where: { id: { in: ids }, status: "active" },
    select: { id: true, question: true, answer: true, updatedAt: true },
  });

  const out: Record<string, DrillMcq> = {};
  const todo: typeof rows = [];
  for (const r of rows) {
    const authored = getAuthoredMcq(r.question);
    const cached = cache.get(`${r.id}:${r.updatedAt.getTime()}`);
    if (authored) out[r.id] = authored;
    else if (cached) out[r.id] = cached;
    else todo.push(r);
  }

  if (todo.length && getAnthropicApiKey()) {
    try {
      const prompt = todo
        .map((r) => `<question id="${r.id}">\n${r.question}\n<model_answer>\n${r.answer}\n</model_answer>\n</question>`)
        .join("\n\n");
      const res = await anthropicJson<{ items: { id: string; correct: string; distractors: string[]; why: string }[] }>(
        `Write drill choices for each question below. Return one item per question id.\n\n${prompt}`,
        SCHEMA,
        { system: SYSTEM, effort: "low", maxTokens: 6000, usageLog: { userId, feature: "mcq-generate" } },
      );
      for (const item of res.items) {
        const row = todo.find((r) => r.id === item.id);
        const w = item.distractors.map((d) => d.trim()).filter(Boolean);
        if (!row || w.length < 3 || !item.correct.trim()) continue;
        const mcq: DrillMcq = { c: item.correct.trim(), w: [w[0], w[1], w[2]], why: item.why?.trim() || undefined };
        cache.set(`${row.id}:${row.updatedAt.getTime()}`, mcq);
        out[row.id] = mcq;
      }
    } catch (e) {
      console.error("[questions/mcq] generation failed", e);
      // Client falls back to choices built from the question bank.
    }
  }

  return NextResponse.json({ mcqs: out });
}
