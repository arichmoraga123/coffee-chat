import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { getUserIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnthropicApiKey } from "@/lib/anthropic";
import { aiSources, findQuestion } from "@/lib/fit-answers";
import { feedbackOn } from "@/lib/fit-ai";

export const maxDuration = 60;

const Body = z.object({
  questionId: z.string().min(1).max(80),
  variant: z.string().max(200).default(""),
  builder: z.record(z.string(), z.string()).default({}),
  linkedStoryIds: z.array(z.string().max(64)).max(20).default([]),
  includedInteractionIds: z.array(z.string().max(64)).max(50).default([]),
  draft: z.string().min(1).max(20_000),
});

/** Feedback on a draft: 1–5 scores, flagged phrases, must-include checks, speaking time. Saved on the answer. */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getAnthropicApiKey()) return NextResponse.json({ error: "AI is not configured" }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Write a draft first." }, { status: 400 });
  const q = await findQuestion(parsed.data.questionId);
  if (!q) return NextResponse.json({ error: "Unknown question" }, { status: 404 });
  try {
    const fb = await feedbackOn(userId, { ...(await aiSources(userId, q, parsed.data)), draft: parsed.data.draft });
    await prisma.fitAnswer.updateMany({
      where: { userId, questionId: q.id, variant: parsed.data.variant.trim() },
      data: { feedback: fb as unknown as Prisma.InputJsonValue },
    });
    return NextResponse.json({ feedback: fb });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI failed" }, { status: 500 });
  }
}
