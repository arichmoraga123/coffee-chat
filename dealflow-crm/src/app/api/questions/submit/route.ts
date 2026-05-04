import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const question = String(body.question ?? "").trim();
  const answer = String(body.answer ?? "").trim();
  const category = String(body.category ?? "").trim();
  const difficulty = String(body.difficulty ?? "Medium").trim();
  const tagsRaw = body.tags;
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.map((t: unknown) => String(t).trim()).filter(Boolean)
    : typeof tagsRaw === "string"
      ? tagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

  if (!question || !answer || !category) {
    return NextResponse.json({ error: "question, answer, and category are required" }, { status: 400 });
  }

  const row = await prisma.question.create({
    data: {
      question,
      answer,
      category,
      subcategory: null,
      difficulty: ["Easy", "Medium", "Hard"].includes(difficulty) ? difficulty : "Medium",
      tags,
      source: "User submission",
      status: "pending",
      submittedById: userId,
      dedupeKey: `pending-${userId}-${randomUUID()}`,
    },
    select: { id: true },
  });

  return NextResponse.json(row, { status: 201 });
}
