import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { lookupKnownFirmType } from "@/lib/known-firms";

export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const firmName = searchParams.get("firmName")?.trim() ?? "";
  const fullName = searchParams.get("fullName")?.trim() ?? "";

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { schoolId: true, school: { select: { id: true, name: true, shortName: true } } },
  });

  let firmType: string | null = null;
  if (firmName) {
    const existing = await prisma.firm.findFirst({
      where: { userId, name: { equals: firmName, mode: "insensitive" } },
      select: { type: true },
    });
    firmType = existing?.type ?? lookupKnownFirmType(firmName);
  }

  let alumniNote: string | null = null;
  let alumniCount = 0;
  if (firmName && user?.schoolId) {
    alumniCount = await prisma.schoolAlumni.count({
      where: {
        schoolId: user.schoolId,
        firmName: { contains: firmName, mode: "insensitive" },
      },
    });
    if (alumniCount > 0) {
      const schoolLabel = user.school?.shortName ?? user.school?.name ?? "your school";
      alumniNote = `${alumniCount} ${schoolLabel} alumni work at ${firmName} — view them for context`;
    }
  }

  return NextResponse.json({ firmType, alumniCount, alumniNote, schoolName: user?.school?.name ?? null });
}
