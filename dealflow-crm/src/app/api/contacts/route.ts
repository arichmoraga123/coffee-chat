import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RecruitingCategory, ReferralProbability } from "@prisma/client";
import { getUserIdFromSession } from "@/lib/auth";
import { extendedContactCreateData } from "@/lib/contact-body";
import { parseFirmType } from "@/lib/firm-type";

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  let firmId = typeof body.firmId === "string" ? body.firmId : "";
  if (firmId) {
    const firm = await prisma.firm.findFirst({ where: { id: firmId, userId }, select: { id: true } });
    if (!firm) return NextResponse.json({ error: "Invalid firm." }, { status: 400 });
  } else {
    const firmName = String(body.firmName ?? "").trim();
    if (!firmName) return NextResponse.json({ error: "Firm is required." }, { status: 400 });
    const firmType = parseFirmType(body.firmType);
    if (!firmType) {
      return NextResponse.json({ error: "Firm type is required when creating a firm." }, { status: 400 });
    }
    const createdFirm = await prisma.firm.create({
      data: {
        name: firmName,
        type: firmType,
        location: (body.location as string) || "Unknown",
        focus: "Generalist",
        userId,
      },
      select: { id: true },
    });
    firmId = createdFirm.id;
  }

  const linkedin =
    body.linkedinUrl != null && String(body.linkedinUrl).trim()
      ? String(body.linkedinUrl).trim()
      : null;

  const contact = await prisma.contact.create({
    data: {
      fullName: String(body.fullName ?? ""),
      email: String(body.email ?? ""),
      phone: body.phone ? String(body.phone) : null,
      linkedinUrl: linkedin,
      firmId,
      group: String(body.group ?? ""),
      title: String(body.title ?? ""),
      location: String(body.location ?? ""),
      school: String(body.school ?? ""),
      recruitingCategory: body.recruitingCategory as RecruitingCategory,
      relationshipStrength: Number(body.relationshipStrength ?? 1),
      referralProbability: body.referralProbability as ReferralProbability,
      notes: String(body.notes ?? ""),
      lastInteractionDate: body.lastInteractionDate ? new Date(String(body.lastInteractionDate)) : null,
      userId,
      ...extendedContactCreateData(body),
    },
  });
  return NextResponse.json(contact);
}
