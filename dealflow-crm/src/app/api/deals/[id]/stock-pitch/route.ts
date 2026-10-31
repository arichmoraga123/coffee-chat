import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { anthropicJson, getAnthropicApiKey } from "@/lib/anthropic";
import { DEAL_GROUNDING_RULES, dealFactSheet } from "@/lib/deal-context";

export const maxDuration = 60;

const str = { type: "string" };
const SCHEMA = {
  type: "object",
  properties: {
    overview: str,
    recommendation: { type: "string", enum: ["Buy", "Hold", "Sell"] },
    thesisBullets: { type: "array", items: str },
    catalysts: { type: "array", items: str },
    risks: { type: "array", items: str },
  },
  required: ["overview", "recommendation", "thesisBullets", "catalysts", "risks"],
  additionalProperties: false,
};

/**
 * Drafts a stock pitch on one public company in the deal (usually the buyer) and saves it
 * to the user's Pitch Builder. Body: { company: string }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getAnthropicApiKey()) {
    return NextResponse.json({ error: "AI is not configured (ANTHROPIC_API_KEY)." }, { status: 503 });
  }
  const { id } = await params;
  const deal = await prisma.deal.findUnique({ where: { id } });
  if (!deal || deal.status !== "published") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { company?: unknown };
  const company = String(body.company ?? deal.acquirer ?? deal.target ?? "").trim().slice(0, 120);
  if (!company) return NextResponse.json({ error: "company required" }, { status: 400 });

  try {
    const draft = await anthropicJson<{
      overview: string;
      recommendation: "Buy" | "Hold" | "Sell";
      thesisBullets: string[];
      catalysts: string[];
      risks: string[];
    }>(
      `${dealFactSheet(deal)}

Draft a stock pitch on ${company} through the lens of this deal: does the transaction make ${company} a buy, hold or sell?
- overview: 2–3 sentences on the business and how the deal changes it.
- thesisBullets: exactly 3 differentiated, specific reasons (variant view vs. consensus).
- catalysts: 3 dated or event-based catalysts (deal close, regulatory decision, synergy milestones, earnings).
- risks: 3 risks with a short mitigant each.
Do not state a current share price or price target — the student will look those up.`,
      SCHEMA,
      {
        system: `You are an equity research analyst coaching a student. ${DEAL_GROUNDING_RULES}`,
        effort: "low",
        maxTokens: 5000,
        usageLog: { userId, feature: "pitch-outline" },
      },
    );

    const pitch = await prisma.stockPitch.create({
      data: {
        userId,
        companyName: company,
        overview: draft.overview.trim(),
        recommendation: draft.recommendation,
        thesisBullets: draft.thesisBullets.map((s) => s.trim()).filter(Boolean).slice(0, 5),
        catalysts: draft.catalysts.map((s) => s.trim()).filter(Boolean).slice(0, 5),
        risks: draft.risks.map((s) => s.trim()).filter(Boolean).slice(0, 5),
      },
      select: { id: true },
    });
    return NextResponse.json({ id: pitch.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI error" }, { status: 500 });
  }
}
