import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { anthropicMessage, getAnthropicApiKey } from "@/lib/anthropic";

/** PRIVATE — only user's debriefs. */
export async function POST() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getAnthropicApiKey()) {
    return NextResponse.json({ error: "AI is not configured (ANTHROPIC_API_KEY)." }, { status: 503 });
  }
  const rows = await prisma.interviewDebrief.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: 30,
  });
  if (rows.length === 0) return NextResponse.json({ analysis: "Log at least one interview debrief to analyze patterns." });
  const blob = rows
    .map(
      (r) =>
        `---\nFirm: ${r.firmName} Round: ${r.round} Date: ${r.date.toISOString().slice(0, 10)} Outcome: ${r.outcome ?? "?"}\nQ: ${r.questionsAsked.join(" | ")}\nWent well: ${r.whatWentWell ?? ""}\nImprove: ${r.improvements ?? ""}`,
    )
    .join("\n");
  const prompt = `You are a recruiting coach. Based ONLY on these private interview debriefs, identify recurring strengths and weaknesses (max 180 words). Be direct and actionable.\n\n${blob}`;
  try {
    const text = await anthropicMessage(prompt, { maxTokens: 900 });
    return NextResponse.json({ analysis: text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
