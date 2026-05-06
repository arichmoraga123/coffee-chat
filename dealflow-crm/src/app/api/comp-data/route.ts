import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const firmName = searchParams.get("firmName")?.trim();
  const role = searchParams.get("role")?.trim();
  const vertical = searchParams.get("vertical")?.trim();
  const yearStr = searchParams.get("year");
  const year = yearStr ? Number(yearStr) : undefined;

  const rows = await prisma.compData.findMany({
    where: {
      ...(firmName ? { firmName: { contains: firmName, mode: "insensitive" } } : {}),
      ...(role ? { role: { contains: role, mode: "insensitive" } } : {}),
      ...(vertical ? { vertical: { contains: vertical, mode: "insensitive" } } : {}),
      ...(year != null && !Number.isNaN(year) ? { year } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 120,
    include: { school: { select: { type: true } } },
  });

  const entries = rows.map((r) => ({
    id: r.id,
    firmName: r.firmName,
    role: r.role,
    vertical: r.vertical,
    officeLocation: r.officeLocation,
    baseComp: r.baseComp,
    signingBonus: r.signingBonus,
    yearEndBonus: r.yearEndBonus,
    totalComp: r.totalComp,
    year: r.year,
    upvotes: r.upvotes,
    schoolType: r.school?.type ?? "unspecified",
  }));

  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const firmName = String(body.firmName ?? "").trim();
  const role = String(body.role ?? "").trim();
  const vertical = String(body.vertical ?? "").trim();
  const year = Number(body.year);
  if (!firmName || !role || !vertical || Number.isNaN(year)) {
    return NextResponse.json({ error: "firmName, role, vertical, and year are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { schoolId: true },
  });

  const row = await prisma.compData.create({
    data: {
      userId,
      schoolId: user?.schoolId ?? null,
      firmName,
      role,
      vertical,
      officeLocation: body.officeLocation ? String(body.officeLocation) : null,
      baseComp: body.baseComp != null ? Number(body.baseComp) : null,
      signingBonus: body.signingBonus != null ? Number(body.signingBonus) : null,
      yearEndBonus: body.yearEndBonus != null ? Number(body.yearEndBonus) : null,
      totalComp: body.totalComp != null ? Number(body.totalComp) : null,
      year,
      anonymous: body.anonymous !== false,
    },
  });

  return NextResponse.json({ id: row.id });
}
