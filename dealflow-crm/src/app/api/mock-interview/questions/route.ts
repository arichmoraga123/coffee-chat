import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

/** SHARED bank (questions); submissions create pending rows. */
export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const bank = searchParams.get("bank");
  const where = {
    status: "active",
    ...(bank ? { bankSource: bank } : {}),
  };
  const questions = await prisma.mockInterviewQuestion.findMany({
    where,
    orderBy: [{ bankSource: "asc" }, { category: "asc" }],
    select: {
      id: true,
      question: true,
      category: true,
      bankSource: true,
      year: true,
      difficulty: true,
      modelAnswer: true,
      tips: true,
      careerTracks: true,
    },
  });
  const counts = await prisma.mockInterviewQuestion.groupBy({
    by: ["bankSource"],
    where: { status: "active" },
    _count: { id: true },
  });
  return NextResponse.json({ questions, bankCounts: Object.fromEntries(counts.map((c) => [c.bankSource, c._count.id])) });
}

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  const question = String(body.question ?? "").trim();
  const bankSource = String(body.bankSource ?? "").trim();
  const category = String(body.category ?? "").trim();
  const difficulty = String(body.difficulty ?? "Medium").trim();
  const year = body.year != null ? Number(body.year) : null;
  const modelAnswer = body.modelAnswer ? String(body.modelAnswer).trim() : null;
  if (!question || !bankSource || !category) {
    return NextResponse.json({ error: "question, bankSource, and category are required" }, { status: 400 });
  }
  const dedupeKey = createHash("sha256").update(`${bankSource}|${question}`).digest("hex");
  const careerTracks = Array.isArray(body.careerTracks)
    ? (body.careerTracks as unknown[]).map((x) => String(x)).filter(Boolean)
    : [];
  const row = await prisma.mockInterviewQuestion.create({
    data: {
      question,
      bankSource,
      category,
      difficulty,
      year: Number.isFinite(year ?? NaN) ? year : null,
      modelAnswer,
      tips: null,
      status: "pending",
      submittedById: userId,
      dedupeKey,
      careerTracks: careerTracks.length ? careerTracks : ["Investment Banking"],
    },
  });
  return NextResponse.json(row);
}
