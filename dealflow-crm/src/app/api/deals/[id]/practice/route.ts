import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { anthropicTextResponse, getAnthropicApiKey } from "@/lib/anthropic";
import { DEAL_GROUNDING_RULES, dealFactSheet } from "@/lib/deal-context";

export const maxDuration = 60;

/** Streams deal-specific technical practice questions with model answers. Response is private to the requester. */
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

Write 5 interview questions about this transaction that test technical understanding (valuation, accretion/dilution or LBO returns, financing, EV vs equity value, deal structure, regulatory). Mix difficulty. For each: the question, then "Answer:" with a crisp 2–4 sentence model answer. Number them 1–5. Plain text.`;

  return anthropicTextResponse(prompt, {
    system: `You are a senior banker running a technical interview. ${DEAL_GROUNDING_RULES}`,
    effort: "low",
    maxTokens: 6000,
    usageLog: { userId, feature: "deal-practice" },
  });
}
