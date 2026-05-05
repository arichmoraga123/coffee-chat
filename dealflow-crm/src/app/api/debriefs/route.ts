import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

/** PRIVATE per user. */
export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.interviewDebrief.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ debriefs: rows });
}

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  const firmName = String(body.firmName ?? "").trim();
  const round = String(body.round ?? "").trim();
  const date = body.date ? new Date(String(body.date)) : new Date();
  const questionsAsked = Array.isArray(body.questionsAsked)
    ? (body.questionsAsked as string[]).map((s) => String(s).trim()).filter(Boolean)
    : [];
  if (!firmName || !round) {
    return NextResponse.json({ error: "firmName and round required" }, { status: 400 });
  }
  const row = await prisma.interviewDebrief.create({
    data: {
      userId,
      firmName,
      round,
      date,
      questionsAsked,
      myAnswers: body.myAnswers ? String(body.myAnswers) : null,
      whatWentWell: body.whatWentWell ? String(body.whatWentWell) : null,
      improvements: body.improvements ? String(body.improvements) : null,
      outcome: body.outcome ? String(body.outcome) : null,
    },
  });
  return NextResponse.json(row);
}
