import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cases = await prisma.caseCompetition.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ cases });
}

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;

  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const date = body.date ? new Date(String(body.date)) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "valid date required" }, { status: 400 });
  }

  const row = await prisma.caseCompetition.create({
    data: {
      userId,
      name,
      organizer: body.organizer ? String(body.organizer).trim() : null,
      date,
      teamMembers: Array.isArray(body.teamMembers)
        ? (body.teamMembers as unknown[]).map((x) => String(x))
        : [],
      role: body.role ? String(body.role).trim() : null,
      topic: body.topic ? String(body.topic).trim() : null,
      result: body.result ? String(body.result).trim() : null,
      description: body.description ? String(body.description).trim() : null,
      driveLink: body.driveLink ? String(body.driveLink).trim() : null,
      skills: Array.isArray(body.skills) ? (body.skills as unknown[]).map((x) => String(x)) : [],
      addToResume: Boolean(body.addToResume),
      resumeBullets: [],
    },
  });

  return NextResponse.json(row, { status: 201 });
}
