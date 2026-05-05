import { NextResponse } from "next/server";
import { getUserIdFromSession } from "@/lib/auth";
import { anthropicMessage, getAnthropicApiKey } from "@/lib/anthropic";

/** PRIVATE — personalization uses user-provided fields only. */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getAnthropicApiKey()) {
    return NextResponse.json({ error: "AI is not configured (ANTHROPIC_API_KEY)." }, { status: 503 });
  }
  const body = (await req.json()) as Record<string, unknown>;
  const template = String(body.template ?? "").trim();
  const yourName = String(body.yourName ?? "").trim();
  const contactName = String(body.contactName ?? "").trim();
  const firm = String(body.firm ?? "").trim();
  if (!template) return NextResponse.json({ error: "template body required" }, { status: 400 });
  const prompt = `Personalize this recruiting email template. Replace bracket placeholders with natural prose. Keep professional tone.\n\nYour name: ${yourName || "[Your Name]"}\nContact first name: ${contactName || "[Name]"}\nTheir firm: ${firm || "[firm]"}\n\nTemplate:\n"""${template}"""\n\nOutput only the final email body (no subject unless clearly part of template).`;
  try {
    const text = await anthropicMessage(prompt, {
      maxTokens: 1200,
      usageLog: { userId, feature: "email-customize" },
    });
    return NextResponse.json({ body: text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
