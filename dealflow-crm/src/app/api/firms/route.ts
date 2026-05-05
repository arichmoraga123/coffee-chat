import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { parseFirmType } from "@/lib/firm-type";

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const type = parseFirmType(body.type);
  if (!type) {
    return NextResponse.json({ error: "Firm type is required" }, { status: 400 });
  }

  const location = String(body.location ?? "").trim() || "Unknown";
  const focus = String(body.focus ?? "").trim() || "Generalist";

  const firm = await prisma.firm.create({
    data: {
      name,
      type,
      location,
      focus,
      aum: body.aum ? String(body.aum).trim() || null : null,
      recruitingNotes: String(body.recruitingNotes ?? "").trim(),
      userId,
    },
  });
  return NextResponse.json(firm);
}
