import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { MCQ_WHERE } from "@/lib/mcq/server";
import { lockedQuestionIds } from "@/lib/challenges";

/** Flashcard mode: the answer for one card, fetched only when the student flips it. Earns nothing. */
export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if ((await lockedQuestionIds(userId)).includes(id)) return NextResponse.json({ error: "Finish your challenge first." }, { status: 423 });
  const q = await prisma.question.findFirst({
    where: { id, ...MCQ_WHERE },
    select: { options: true, correctIndex: true, explanation: true, lessonId: true },
  });
  if (!q || q.correctIndex === null) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ answer: q.options[q.correctIndex], explanation: q.explanation, lessonId: q.lessonId });
}
