import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { anthropicMessage, getAnthropicApiKey } from "@/lib/anthropic";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getAnthropicApiKey()) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const { id } = await ctx.params;
  const row = await prisma.caseCompetition.findFirst({
    where: { id, userId },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const prompt = [
    "Generate exactly 2-3 concise resume bullet points for IB/PE recruiting based on this case competition:",
    `Competition: ${row.name}`,
    row.organizer ? `Organizer: ${row.organizer}` : "",
    `Date: ${row.date.toISOString().slice(0, 10)}`,
    row.role ? `My role: ${row.role}` : "",
    row.topic ? `Topic: ${row.topic}` : "",
    row.result ? `Result: ${row.result}` : "",
    row.description ? `Details: ${row.description}` : "",
    row.skills?.length ? `Skills: ${row.skills.join(", ")}` : "",
    "",
    "Return ONLY a JSON array of strings, e.g. [\"bullet1\",\"bullet2\"]. No markdown.",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await anthropicMessage(prompt, {
    maxTokens: 600,
    usageLog: { userId, feature: "case-resume-bullets" },
    system: "You write sharp finance resume bullets with metrics where plausible.",
  });

  let bullets: string[] = [];
  try {
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end <= start) throw new Error("no array");
    bullets = JSON.parse(raw.slice(start, end + 1)) as string[];
    if (!Array.isArray(bullets)) throw new Error("not array");
    bullets = bullets.map((b) => String(b).trim()).filter(Boolean).slice(0, 5);
  } catch {
    bullets = raw
      .split("\n")
      .map((s) => s.replace(/^[-•\d.)]+\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 3);
  }

  const updated = await prisma.caseCompetition.update({
    where: { id },
    data: { resumeBullets: bullets, addToResume: true },
  });

  return NextResponse.json({ case: updated });
}
