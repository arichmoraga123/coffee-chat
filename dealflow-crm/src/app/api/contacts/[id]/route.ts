import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RecruitingCategory, ReferralProbability } from "@prisma/client";
import { getUserIdFromSession } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const existing = await prisma.contact.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const firm = await prisma.firm.findFirst({ where: { id: body.firmId, userId }, select: { id: true } });
  if (!firm) return NextResponse.json({ error: "Invalid firm." }, { status: 400 });

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      fullName: body.fullName,
      email: body.email,
      phone: body.phone || null,
      linkedinUrl: body.linkedinUrl,
      firmId: body.firmId,
      group: body.group,
      title: body.title,
      location: body.location,
      school: body.school,
      recruitingCategory: body.recruitingCategory as RecruitingCategory,
      relationshipStrength: Number(body.relationshipStrength ?? 1),
      referralProbability: body.referralProbability as ReferralProbability,
      notes: body.notes || "",
      lastInteractionDate: body.lastInteractionDate ? new Date(body.lastInteractionDate) : null,
    },
  });
  return NextResponse.json(contact);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.contact.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
