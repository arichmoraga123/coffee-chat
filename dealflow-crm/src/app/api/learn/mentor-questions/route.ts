import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { getLesson } from "@/lib/learn/lessons";
import { alertNewMentorQuestion } from "@/lib/mentor-alerts";

/** Student — send a question about a lesson (optionally a specific block) to the PE@Broad mentors. */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { lessonId?: unknown; blockId?: unknown; question?: unknown };
  const lesson = getLesson(String(body.lessonId ?? ""));
  if (!lesson) return NextResponse.json({ error: "Unknown lesson" }, { status: 400 });
  const question = String(body.question ?? "").trim().slice(0, 2000);
  if (question.length < 10) return NextResponse.json({ error: "Add a bit more detail to your question." }, { status: 400 });
  const blockId = body.blockId ? String(body.blockId) : null;
  if (blockId && !lesson.blocks.some((b) => b.id === blockId)) {
    return NextResponse.json({ error: "Unknown part of the lesson" }, { status: 400 });
  }
  const openCount = await prisma.mentorQuestion.count({ where: { userId, status: "open" } });
  if (openCount >= 10) {
    return NextResponse.json({ error: "You have 10 open questions — wait for a mentor to answer some first." }, { status: 429 });
  }
  const q = await prisma.mentorQuestion.create({
    data: { userId, lessonId: lesson.id, blockId, question },
    select: { id: true, question: true, answer: true, status: true, blockId: true, createdAt: true },
  });
  await alertNewMentorQuestion({ id: q.id, lessonId: lesson.id, question, userId }).catch((e) => console.error("mentor alert failed", e));
  return NextResponse.json({ question: { ...q, createdAt: q.createdAt.toISOString() } }, { status: 201 });
}
