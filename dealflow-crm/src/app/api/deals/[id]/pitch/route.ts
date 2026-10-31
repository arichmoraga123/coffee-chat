import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { anthropicTextResponse, getAnthropicApiKey } from "@/lib/anthropic";
import { DEAL_GROUNDING_RULES, dealFactSheet } from "@/lib/deal-context";

export const maxDuration = 60;

const SYSTEM = `You coach college students to answer "Walk me through a deal you've followed" in investment banking and PE interviews.
${DEAL_GROUNDING_RULES}
Write in plain text with short section labels (no markdown tables, no # headers). Be concrete and interview-ready.`;

/** Streams an interview-ready ~2-minute "tell me about a deal" script for this deal. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getAnthropicApiKey()) {
    return NextResponse.json({ error: "AI is not configured (ANTHROPIC_API_KEY)." }, { status: 503 });
  }
  const { id } = await params;
  const deal = await prisma.deal.findUnique({ where: { id } });
  if (!deal || deal.status !== "published") return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prompt = `${dealFactSheet(deal)}

Write:
1) THE 2-MINUTE PITCH — a first-person script (~250 words) the student can say out loud, in this order: the deal in one sentence; who the companies are; key terms and valuation; strategic rationale (2–3 reasons); the biggest risks; "my view" — would I do this deal as the buyer, and why.
2) NUMBERS TO MEMORIZE — 3–5 bullets.
3) LIKELY FOLLOW-UPS — 4 tough questions an interviewer would ask about this deal, each with a 1–2 sentence model answer (e.g. was the premium justified, accretion/dilution, how it was financed, what comps it trades vs., who else could have bid).`;

  return anthropicTextResponse(prompt, {
    system: SYSTEM,
    effort: "low",
    maxTokens: 6000,
    usageLog: { userId, feature: "deal-pitch" },
  });
}
