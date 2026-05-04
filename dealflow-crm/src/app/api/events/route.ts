import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

const TYPES = ["coffee_chat", "deadline", "interview", "networking", "other"] as const;

export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const events = await prisma.recruitingEvent.findMany({
    where: { userId },
    orderBy: { date: "asc" },
  });
  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const title = String(body.title ?? "").trim();
  const dateStr = String(body.date ?? "");
  const type = String(body.type ?? "other");
  const firmName = body.firmName ? String(body.firmName).trim() : null;
  const notes = body.notes ? String(body.notes).trim() : null;

  if (!title || !dateStr) {
    return NextResponse.json({ error: "title and date required" }, { status: 400 });
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }
  const safeType = TYPES.includes(type as (typeof TYPES)[number]) ? type : "other";

  const event = await prisma.recruitingEvent.create({
    data: {
      userId,
      title,
      date,
      type: safeType,
      firmName,
      notes,
    },
  });
  return NextResponse.json(event, { status: 201 });
}
