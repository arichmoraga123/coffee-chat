import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const existing = await prisma.interviewDebrief.findFirst({ where: { id, userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (body.firmName !== undefined) data.firmName = String(body.firmName).trim();
  if (body.round !== undefined) data.round = String(body.round).trim();
  if (body.date !== undefined) data.date = new Date(String(body.date));
  if (body.questionsAsked !== undefined) {
    data.questionsAsked = Array.isArray(body.questionsAsked)
      ? (body.questionsAsked as string[]).map((s) => String(s).trim()).filter(Boolean)
      : [];
  }
  if (body.myAnswers !== undefined) data.myAnswers = body.myAnswers ? String(body.myAnswers) : null;
  if (body.whatWentWell !== undefined) data.whatWentWell = body.whatWentWell ? String(body.whatWentWell) : null;
  if (body.improvements !== undefined) data.improvements = body.improvements ? String(body.improvements) : null;
  if (body.outcome !== undefined) data.outcome = body.outcome ? String(body.outcome) : null;
  const row = await prisma.interviewDebrief.update({ where: { id }, data: data as never });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const r = await prisma.interviewDebrief.deleteMany({ where: { id, userId } });
  if (r.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
