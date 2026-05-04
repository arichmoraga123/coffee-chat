import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RecruitingCategory, ReferralProbability } from "@prisma/client";
import { getUserIdFromSession } from "@/lib/auth";

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  let firmId = typeof body.firmId === "string" ? body.firmId : "";
  if (firmId) {
    const firm = await prisma.firm.findFirst({ where: { id: firmId, userId }, select: { id: true } });
    if (!firm) return NextResponse.json({ error: "Invalid firm." }, { status: 400 });
  } else {
    const firmName = String(body.firmName ?? "").trim();
    if (!firmName) return NextResponse.json({ error: "Firm is required." }, { status: 400 });
    const createdFirm = await prisma.firm.create({
      data: {
        name: firmName,
        type: "IB",
        location: body.location || "Unknown",
        focus: "Generalist",
        userId,
      },
      select: { id: true },
    });
    firmId = createdFirm.id;
  }

  const contact = await prisma.contact.create({
    data: {
      fullName: body.fullName,
      email: body.email,
      phone: body.phone || null,
      linkedinUrl: body.linkedinUrl,
      firmId,
      group: body.group,
      title: body.title,
      location: body.location,
      school: body.school,
      recruitingCategory: body.recruitingCategory as RecruitingCategory,
      relationshipStrength: Number(body.relationshipStrength ?? 1),
      referralProbability: body.referralProbability as ReferralProbability,
      notes: body.notes || "",
      lastInteractionDate: body.lastInteractionDate ? new Date(body.lastInteractionDate) : null,
      userId,
    },
  });
  return NextResponse.json(contact);
}
