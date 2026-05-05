import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { parseFirmType } from "@/lib/firm-type";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;

  const existing = await prisma.firm.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Prisma.FirmUpdateInput = {};

  if ("name" in body) data.name = String(body.name ?? "").trim();
  if ("type" in body) {
    if (body.type === null || body.type === "") {
      data.type = null;
    } else {
      const t = parseFirmType(body.type);
      if (!t) return NextResponse.json({ error: "Invalid firm type" }, { status: 400 });
      data.type = t;
    }
  }
  if ("location" in body) data.location = String(body.location ?? "").trim();
  if ("focus" in body) data.focus = String(body.focus ?? "").trim();
  if ("aum" in body) data.aum = body.aum ? String(body.aum).trim() : null;
  if ("recruitingNotes" in body) data.recruitingNotes = String(body.recruitingNotes ?? "");

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const firm = await prisma.firm.update({ where: { id }, data });
  return NextResponse.json(firm);
}
