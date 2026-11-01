import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { getAnthropicApiKey } from "@/lib/anthropic";
import { polishStory } from "@/lib/storybank-ai";

/** AI cleanup: brain dump → STAR story, one-liner, 2-minute version, matching questions, coaching notes. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getAnthropicApiKey()) return NextResponse.json({ error: "AI is not configured (ANTHROPIC_API_KEY)." }, { status: 503 });
  const { id } = await ctx.params;
  const story = await prisma.story.findFirst({ where: { id, userId } });
  if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const words = story.rawText.trim().split(/\s+/).filter(Boolean).length;
  if (words < 40) return NextResponse.json({ error: "Write a bit more first (at least a few sentences). Messy is fine." }, { status: 400 });

  const others = await prisma.story.findMany({ where: { userId, id: { not: id }, polished: { not: undefined } }, select: { title: true, polished: true } });
  const otherLines = others
    .map((o) => (o.polished as { oneLiner?: string } | null)?.oneLiner ?? o.title)
    .filter(Boolean) as string[];

  try {
    const r = await polishStory(userId, story.slot, story.rawText, otherLines);
    const polished = {
      title: r.title,
      situation: r.situation,
      task: r.task,
      action: r.action,
      result: r.result,
      oneLiner: r.oneLiner,
      twoMinute: r.twoMinute,
      followUps: r.followUps,
    };
    const updated = await prisma.story.update({
      where: { id },
      data: {
        title: r.title,
        polished: polished as Prisma.InputJsonValue,
        questions: r.questions as unknown as Prisma.InputJsonValue,
        feedback: r.feedback.join("\n"),
      },
    });
    return NextResponse.json({ story: updated });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI request failed" }, { status: 502 });
  }
}
