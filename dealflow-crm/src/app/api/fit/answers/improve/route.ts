import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserIdFromSession } from "@/lib/auth";
import { getAnthropicApiKey } from "@/lib/anthropic";
import { aiSources, findQuestion } from "@/lib/fit-answers";
import { improveDraft } from "@/lib/fit-ai";

export const maxDuration = 60;

const Body = z.object({
  questionId: z.string().min(1).max(80),
  variant: z.string().max(200).default(""),
  builder: z.record(z.string(), z.string()).default({}),
  linkedStoryIds: z.array(z.string().max(64)).max(20).default([]),
  includedInteractionIds: z.array(z.string().max(64)).max(50).default([]),
  draft: z.string().max(20_000).default(""),
});

/** "Improve with AI": a draft that uses only the student's own facts, with [ADD: …] where something is missing. */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getAnthropicApiKey()) return NextResponse.json({ error: "AI is not configured" }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const q = await findQuestion(parsed.data.questionId);
  if (!q) return NextResponse.json({ error: "Unknown question" }, { status: 404 });
  try {
    return NextResponse.json(await improveDraft(userId, await aiSources(userId, q, parsed.data)));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI failed" }, { status: 500 });
  }
}
