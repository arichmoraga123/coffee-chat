import { NextResponse } from "next/server";
import { getUserIdFromSession } from "@/lib/auth";
import { anthropicMessage, getAnthropicApiKey } from "@/lib/anthropic";

/** PRIVATE — offers JSON from client. */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getAnthropicApiKey()) {
    return NextResponse.json({ error: "AI is not configured (ANTHROPIC_API_KEY)." }, { status: 503 });
  }
  const body = (await req.json()) as { offers?: unknown };
  if (!Array.isArray(body.offers) || body.offers.length === 0) {
    return NextResponse.json({ error: "offers array required" }, { status: 400 });
  }
  const prompt = `Compare these job offers for an MSU Broad finance student. Evaluate comp (base, signing, bonus), location, prestige, deal flow/learning, and exit options. Then give a structured recommendation (max 250 words). Use bullet sections.\n\n${JSON.stringify(body.offers, null, 2)}`;
  try {
    const text = await anthropicMessage(prompt, { maxTokens: 1500 });
    return NextResponse.json({ analysis: text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
