import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

/** PRIVATE per user. */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  const mode = String(body.mode ?? "");
  const bankFilter = body.bankFilter ? String(body.bankFilter) : null;
  const questions = Array.isArray(body.questions) ? (body.questions as string[]) : [];
  const scores = body.scores ?? {};
  const duration = Number(body.duration ?? 0);
  const aiSummary = body.aiSummary ? String(body.aiSummary) : null;
  if (!["practice", "timed", "bank-specific"].includes(mode)) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }
  const session = await prisma.mockInterviewSession.create({
    data: {
      userId,
      mode,
      bankFilter,
      questions,
      scores: scores as object,
      duration: Number.isFinite(duration) ? duration : 0,
      aiSummary,
    },
  });
  return NextResponse.json(session);
}
