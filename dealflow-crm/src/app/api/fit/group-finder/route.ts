import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { getUserIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGroupFinderData } from "@/lib/fit-content";
import { scoreGroupFinder } from "@/lib/groupFinder";

const Body = z.object({ answers: z.record(z.string().max(20), z.number().int().min(0).max(50)) });

/** Scores the questionnaire on the server (with the admin-edited weights) and saves the result with a date. */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid answers" }, { status: 400 });
  const data = await getGroupFinderData();
  const required = data.questions.filter((q) => !((q.weight ?? 1) < 1 || q.optional));
  if (required.some((q) => parsed.data.answers[q.id] === undefined)) return NextResponse.json({ error: "Answer every question (the city one is optional)." }, { status: 400 });
  const results = scoreGroupFinder(parsed.data.answers, data);
  const row = await prisma.groupFinderResult.create({
    data: { userId, answers: parsed.data.answers as Prisma.InputJsonValue, results: results as unknown as Prisma.InputJsonValue, topGroupId: results[0].id },
    select: { id: true, createdAt: true },
  });
  return NextResponse.json({ id: row.id, createdAt: row.createdAt.toISOString(), results });
}
