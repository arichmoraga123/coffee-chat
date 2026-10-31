import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { anthropicTextResponse, getAnthropicApiKey } from "@/lib/anthropic";
import { allLessons, getLesson } from "@/lib/learn/lessons";

export const maxDuration = 60;

const DAILY_LIMIT = 30;

function systemPrompt(lessonId: string): string | null {
  const lesson = getLesson(lessonId);
  if (!lesson) return null;
  const curriculum = allLessons()
    .map((l) => `${l.id.replace("-", ".")} ${l.title}`)
    .join("\n");
  return `You are the Prospect Learn tutor for PE@Broad, helping college freshmen prepare for investment banking and private equity technical interviews.

The student is on lesson ${lesson.id.replace("-", ".")} "${lesson.title}" (module: ${lesson.moduleTitle}). The full lesson content is below as JSON — treat it as the source of truth.

How to answer:
- Answer the student's question about this topic in plain language a freshman can follow. Keep it short (usually under 200 words) and use a small numeric example when it helps.
- Teach the reasoning. For workbook or practice questions, explain the method and point to the right formula — don't just hand over the final number for a workbook cell.
- When it's useful, end with the one-sentence version they could say in an interview.
- If the question is about a different topic, answer briefly and point them to the right lesson by number from the curriculum list (e.g. "See lesson 6.4").
- If you're not sure, say so. Never invent facts about specific firms or interview processes.

Curriculum:
${curriculum}

Lesson JSON:
${JSON.stringify(lesson)}`;
}

type Msg = { role: "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getAnthropicApiKey()) return NextResponse.json({ error: "The tutor isn't configured yet." }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { lessonId?: unknown; messages?: unknown };
  const system = systemPrompt(String(body.lessonId ?? ""));
  if (!system) return NextResponse.json({ error: "Unknown lesson" }, { status: 400 });

  const messages: Msg[] = Array.isArray(body.messages)
    ? (body.messages as unknown[])
        .filter(
          (m): m is Msg =>
            typeof m === "object" &&
            m !== null &&
            ((m as Msg).role === "user" || (m as Msg).role === "assistant") &&
            typeof (m as Msg).content === "string" &&
            (m as Msg).content.trim().length > 0,
        )
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
    : [];
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  }
  while (messages.length && messages[0].role !== "user") messages.shift();

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const used = await prisma.apiUsageLog.count({ where: { userId, feature: "learn-tutor", createdAt: { gte: since } } });
  if (used >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: `You've used today's ${DAILY_LIMIT} tutor messages. Try again tomorrow, or ask a mentor below.` },
      { status: 429 },
    );
  }

  try {
    return await anthropicTextResponse(
      { messages },
      { system, cacheSystem: true, effort: "low", maxTokens: 4000, usageLog: { userId, feature: "learn-tutor" } },
    );
  } catch (e) {
    console.error("[learn/tutor]", e);
    return NextResponse.json({ error: "The tutor is busy — try again in a moment." }, { status: 502 });
  }
}
