import { NextResponse } from "next/server";
import { getUserIdFromSession } from "@/lib/auth";
import { anthropicMessage, getAnthropicApiKey } from "@/lib/anthropic";

/** PRIVATE — user's answer only sent to model. */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getAnthropicApiKey()) {
    return NextResponse.json({ error: "AI is not configured (ANTHROPIC_API_KEY)." }, { status: 503 });
  }
  const body = (await req.json()) as Record<string, unknown>;
  const question = String(body.question ?? "").trim();
  const draft = String(body.draftAnswer ?? "").trim();
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });
  const prompt = `You are an investment banking / PE mock interviewer. The candidate was asked:\n\n"""${question}"""\n\nTheir typed draft answer (may be empty):\n"""${draft || "(none)"}"""\n\nGive concise feedback on: (1) structure, (2) content depth, (3) conciseness. Bullet points, max 200 words.`;
  try {
    const text = await anthropicMessage(prompt, {
      maxTokens: 800,
      usageLog: { userId, feature: "mock-feedback" },
    });
    return NextResponse.json({ feedback: text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
