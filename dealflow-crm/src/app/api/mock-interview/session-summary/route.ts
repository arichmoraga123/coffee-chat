import { NextResponse } from "next/server";
import { getUserIdFromSession } from "@/lib/auth";
import { anthropicMessage, getAnthropicApiKey } from "@/lib/anthropic";

/** PRIVATE — session stats only. */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getAnthropicApiKey()) {
    return NextResponse.json({ error: "AI is not configured (ANTHROPIC_API_KEY)." }, { status: 503 });
  }
  const body = (await req.json()) as Record<string, unknown>;
  const breakdown = String(body.breakdown ?? "");
  const weakCategories = String(body.weakCategories ?? "");
  const prompt = `Mock interview recap for the candidate (private coaching):\n\nScore breakdown by category:\n${breakdown || "N/A"}\n\nCategories with weaker self-grades:\n${weakCategories || "N/A"}\n\nIn 120 words max, summarize top 2–3 improvement themes and one concrete practice habit.`;
  try {
    const text = await anthropicMessage(prompt, {
      maxTokens: 600,
      usageLog: { userId, feature: "mock-summary" },
    });
    return NextResponse.json({ summary: text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
