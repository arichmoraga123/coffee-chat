import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const progress = await prisma.userQuestionProgress.findMany({
    where: { userId },
    select: { questionId: true, status: true, lastSeen: true },
  });
  return NextResponse.json({ progress });
}

export async function PATCH(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const questionId = String(body.questionId ?? "");
  const status = String(body.status ?? "");
  if (!questionId || !["known", "review", "unseen"].includes(status)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const question = await prisma.question.findFirst({
    where: { id: questionId, status: "active" },
    select: { id: true },
  });
  if (!question) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const row = await prisma.userQuestionProgress.upsert({
    where: { userId_questionId: { userId, questionId } },
    create: { userId, questionId, status },
    update: { status, lastSeen: new Date() },
  });
  return NextResponse.json(row);
}
