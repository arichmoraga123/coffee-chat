import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notifyQuestionAnswered } from "@/lib/mentor-alerts";

/** Mentor/admin — answer a student question; `public: true` adds it to the lesson as an FAQ deep dive. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, name: true, accountActive: true } });
  if (!me?.accountActive || (me.role !== "ADMIN" && me.role !== "MENTOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { answer?: unknown; public?: unknown };
  const existing = await prisma.mentorQuestion.findUnique({ where: { id }, select: { id: true, answer: true, status: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const answer = body.answer !== undefined ? String(body.answer).trim().slice(0, 6000) : undefined;
  if (answer !== undefined && answer.length < 2) return NextResponse.json({ error: "Write an answer first." }, { status: 400 });
  const isPublic = body.public !== undefined ? Boolean(body.public) : undefined;
  if (isPublic && !(answer ?? existing.answer)) {
    return NextResponse.json({ error: "Answer the question before adding it as an FAQ." }, { status: 400 });
  }

  const row = await prisma.mentorQuestion.update({
    where: { id },
    data: {
      ...(answer !== undefined
        ? { answer, status: "answered", answeredBy: me.name, answeredAt: new Date(), seenByUser: false }
        : {}),
      ...(isPublic !== undefined ? { public: isPublic } : {}),
    },
  });
  if (answer !== undefined && existing.status !== "answered") {
    await notifyQuestionAnswered({ id: row.id, userId: row.userId, lessonId: row.lessonId, answeredBy: row.answeredBy }).catch((e) => console.error("answer notify failed", e));
  }
  return NextResponse.json({ question: row });
}
