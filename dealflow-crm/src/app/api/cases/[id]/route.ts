import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const existing = await prisma.caseCompetition.findFirst({
    where: { id, userId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.organizer !== undefined) data.organizer = body.organizer ? String(body.organizer).trim() : null;
  if (body.date !== undefined) {
    const d = new Date(String(body.date));
    if (Number.isNaN(d.getTime())) return NextResponse.json({ error: "bad date" }, { status: 400 });
    data.date = d;
  }
  if (body.teamMembers !== undefined)
    data.teamMembers = Array.isArray(body.teamMembers)
      ? (body.teamMembers as unknown[]).map((x) => String(x))
      : [];
  if (body.role !== undefined) data.role = body.role ? String(body.role).trim() : null;
  if (body.topic !== undefined) data.topic = body.topic ? String(body.topic).trim() : null;
  if (body.result !== undefined) data.result = body.result ? String(body.result).trim() : null;
  if (body.description !== undefined) data.description = body.description ? String(body.description).trim() : null;
  if (body.driveLink !== undefined) data.driveLink = body.driveLink ? String(body.driveLink).trim() : null;
  if (body.skills !== undefined)
    data.skills = Array.isArray(body.skills) ? (body.skills as unknown[]).map((x) => String(x)) : [];
  if (body.addToResume !== undefined) data.addToResume = Boolean(body.addToResume);
  if (body.resumeBullets !== undefined)
    data.resumeBullets = Array.isArray(body.resumeBullets)
      ? (body.resumeBullets as unknown[]).map((x) => String(x))
      : [];

  const row = await prisma.caseCompetition.update({
    where: { id },
    data: data as never,
  });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const deleted = await prisma.caseCompetition.deleteMany({
    where: { id, userId },
  });
  if (!deleted.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
