import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { anthropicMessage, getAnthropicApiKey } from "@/lib/anthropic";

/** Uses SHARED deal context; response is PRIVATE to the requester. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getAnthropicApiKey()) {
    return NextResponse.json({ error: "AI is not configured (ANTHROPIC_API_KEY)." }, { status: 503 });
  }
  const { id } = await params;
  const deal = await prisma.deal.findUnique({ where: { id } });
  if (!deal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const prompt = `Generate exactly 3 concise technical or deal-style interview questions a banking/PE candidate could be asked about this transaction. Number them 1–3.\n\nTitle: ${deal.title}\nSummary: ${deal.summary}\nThesis: ${deal.keyThesis ?? "N/A"}\nRisks: ${deal.risks ?? "N/A"}`;
  try {
    const text = await anthropicMessage(prompt, { maxTokens: 700 });
    return NextResponse.json({ questions: text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
