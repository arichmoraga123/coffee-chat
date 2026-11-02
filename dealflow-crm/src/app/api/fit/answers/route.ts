import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { builderJson, findQuestion, loadAnswer } from "@/lib/fit-answers";

/** GET ?questionId&variant → the saved answer and its versions. */
export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  return NextResponse.json({ answer: await loadAnswer(userId, sp.get("questionId") ?? "", (sp.get("variant") ?? "").slice(0, 200)) });
}

const Body = z.object({
  questionId: z.string().min(1).max(80),
  variant: z.string().max(200).default(""),
  builder: z.record(z.string(), z.string()).default({}),
  linkedStoryIds: z.array(z.string().max(64)).max(20).default([]),
  includedInteractionIds: z.array(z.string().max(64)).max(50).default([]),
  draft: z.string().max(20_000).default(""),
});

/** PUT: save the answer. Each save that changes the draft keeps a dated version. */
export async function PUT(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid answer" }, { status: 400 });
  const b = parsed.data;
  if (!(await findQuestion(b.questionId))) return NextResponse.json({ error: "Unknown question" }, { status: 404 });
  const where = { userId_questionId_variant: { userId, questionId: b.questionId, variant: b.variant.trim() } };
  const prev = await prisma.fitAnswer.findUnique({ where, select: { draft: true, status: true } });
  const hasContent = b.draft.trim() || Object.values(b.builder).some((v) => v.trim());
  const status = prev?.status === "practiced" ? "practiced" : hasContent ? "drafted" : "not_started";
  const data = { builder: builderJson(b.builder), linkedStoryIds: b.linkedStoryIds, includedInteractionIds: b.includedInteractionIds, draft: b.draft, status };
  const a = await prisma.fitAnswer.upsert({ where, update: data, create: { userId, questionId: b.questionId, variant: b.variant.trim(), ...data } });
  if (b.draft.trim() && b.draft.trim() !== (prev?.draft ?? "").trim()) {
    await prisma.fitAnswerVersion.create({ data: { answerId: a.id, draft: b.draft, builder: builderJson(b.builder) } });
  }
  return NextResponse.json({ answer: await loadAnswer(userId, b.questionId, b.variant.trim()) });
}
