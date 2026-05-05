import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { questionDedupeKey } from "@/lib/question-dedupe";

export async function GET(req: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const category = searchParams.get("category")?.trim();
  const difficulty = searchParams.get("difficulty")?.trim();
  const status = searchParams.get("status")?.trim();

  const where: Record<string, unknown> = {};
  if (status && status !== "all") where.status = status;
  if (category && category !== "all") where.category = category;
  if (difficulty && difficulty !== "all") where.difficulty = difficulty;
  if (q) {
    where.OR = [{ question: { contains: q } }, { answer: { contains: q } }];
  }

  const questions = await prisma.question.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    take: 500,
    select: {
      id: true,
      question: true,
      answer: true,
      category: true,
      subcategory: true,
      difficulty: true,
      tags: true,
      keywords: true,
      source: true,
      status: true,
      submittedById: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ questions });
}

export async function POST(req: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const question = String(body.question ?? "").trim();
  const answer = String(body.answer ?? "").trim();
  const category = String(body.category ?? "").trim();
  const difficulty = String(body.difficulty ?? "Medium");
  const tags = Array.isArray(body.tags) ? body.tags.map((t: unknown) => String(t)) : [];
  const keywords = Array.isArray(body.keywords) ? body.keywords.map((t: unknown) => String(t)) : [];
  const source = body.source ? String(body.source) : null;

  if (!question || !answer || !category) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const row = await prisma.question.create({
    data: {
      question,
      answer,
      category,
      subcategory: body.subcategory ? String(body.subcategory) : null,
      difficulty: ["Easy", "Medium", "Hard"].includes(difficulty) ? difficulty : "Medium",
      tags,
      keywords,
      source,
      status: "active",
      dedupeKey: questionDedupeKey(question),
    },
  });
  return NextResponse.json(row, { status: 201 });
}
