import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { questionDedupeKey } from "@/lib/question-dedupe";

type Row = {
  question: string;
  answer: string;
  category: string;
  subcategory?: string | null;
  difficulty: string;
  tags: string[];
  source?: string | null;
};

export async function POST(req: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const items = body.questions as unknown;
  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "questions must be a JSON array" }, { status: 400 });
  }

  const rows: Row[] = [];
  for (const raw of items) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const question = String(o.question ?? "").trim();
    const answer = String(o.answer ?? "").trim();
    const category = String(o.category ?? "").trim();
    const difficulty = String(o.difficulty ?? "Medium");
    const tags = Array.isArray(o.tags) ? o.tags.map((t) => String(t)) : [];
    if (!question || !answer || !category) continue;
    rows.push({
      question,
      answer,
      category,
      subcategory: o.subcategory != null ? String(o.subcategory) : null,
      difficulty: ["Easy", "Medium", "Hard"].includes(difficulty) ? difficulty : "Medium",
      tags,
      source: o.source != null ? String(o.source) : "Bulk import",
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid questions in array" }, { status: 400 });
  }

  const data = rows.map((r) => ({
    question: r.question,
    answer: r.answer,
    category: r.category,
    subcategory: r.subcategory ?? null,
    difficulty: r.difficulty,
    tags: r.tags,
    source: r.source ?? "Bulk import",
    status: "active",
    dedupeKey: questionDedupeKey(r.question),
  }));

  const result = await prisma.question.createMany({
    data,
    skipDuplicates: true,
  });

  return NextResponse.json({ inserted: result.count });
}
