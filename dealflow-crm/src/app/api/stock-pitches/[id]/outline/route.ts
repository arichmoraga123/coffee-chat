import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { anthropicMessage, getAnthropicApiKey } from "@/lib/anthropic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const pitch = await prisma.stockPitch.findFirst({ where: { id, userId } });
  if (!pitch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!getAnthropicApiKey()) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  const prompt = `You are helping a business school student outline a stock pitch deck.

Company: ${pitch.companyName}
Recommendation: ${pitch.recommendation}
Overview:
${pitch.overview}

Thesis bullets:
${pitch.thesisBullets.map((b, i) => `${i + 1}. ${b}`).join("\n")}

Valuation: current ${pitch.currentPrice ?? "n/a"} vs target ${pitch.targetPrice ?? "n/a"}

Catalysts:
${pitch.catalysts.map((b, i) => `${i + 1}. ${b}`).join("\n")}

Risks:
${pitch.risks.map((b, i) => `${i + 1}. ${b}`).join("\n")}

Produce a concise slide-by-slide outline (10–15 slides) suitable for a 5–8 minute pitch: titles only plus one line per slide. No investment advice disclaimers beyond one short line.`;

  const outline = await anthropicMessage(prompt, {
    maxTokens: 2000,
    usageLog: { userId, feature: "pitch-outline" },
  });
  const row = await prisma.stockPitch.update({
    where: { id },
    data: { deckOutline: outline },
  });
  return NextResponse.json({ pitch: row });
}
