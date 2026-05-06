import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { schoolId: true, school: { select: { name: true } } },
  });

  const schoolId = searchParams.get("schoolId") ?? user?.schoolId;
  if (!schoolId) {
    return NextResponse.json({ schoolId: null, schoolName: null, alumni: [] });
  }

  const firmName = searchParams.get("firmName")?.trim();
  const vertical = searchParams.get("vertical")?.trim();
  const gradYearStr = searchParams.get("gradYear");
  const gradYear = gradYearStr ? Number(gradYearStr) : undefined;

  const alumni = await prisma.schoolAlumni.findMany({
    where: {
      schoolId,
      ...(firmName ? { firmName: { contains: firmName, mode: "insensitive" } } : {}),
      ...(vertical ? { vertical: { contains: vertical, mode: "insensitive" } } : {}),
      ...(gradYear != null && !Number.isNaN(gradYear) ? { gradYear } : {}),
    },
    orderBy: { firmName: "asc" },
    take: 200,
  });

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true },
  });

  return NextResponse.json({
    schoolId,
    schoolName: school?.name ?? user?.school?.name ?? null,
    alumni,
  });
}

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const schoolId = String(body.schoolId ?? "").trim();
  const firmName = String(body.firmName ?? "").trim();
  const role = String(body.role ?? "").trim();
  const vertical = String(body.vertical ?? "").trim();
  if (!schoolId || !firmName || !role || !vertical) {
    return NextResponse.json({ error: "schoolId, firmName, role, and vertical are required" }, { status: 400 });
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) return NextResponse.json({ error: "Invalid school" }, { status: 400 });

  const gradYear = body.gradYear != null ? Number(body.gradYear) : null;

  const row = await prisma.schoolAlumni.create({
    data: {
      schoolId,
      firmName,
      role,
      vertical,
      gradYear: gradYear != null && !Number.isNaN(gradYear) ? gradYear : null,
      linkedinUrl: body.linkedinUrl ? String(body.linkedinUrl) : null,
      openToChat: Boolean(body.openToChat),
      anonymous: Boolean(body.anonymous),
      submittedBy: userId,
    },
  });

  return NextResponse.json({ id: row.id });
}
