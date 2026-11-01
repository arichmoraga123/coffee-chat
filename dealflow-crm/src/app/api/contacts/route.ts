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
    // Reuse an existing firm with the same name; a new firm's type is optional (defaults to Other).
    const existing = await prisma.firm.findFirst({ where: { userId, name: { equals: firmName, mode: "insensitive" } }, select: { id: true } });
    const firmType = parseFirmType(body.firmType) ?? "OTHER";
    const createdFirm = existing ?? await prisma.firm.create({
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

  const fullName = (String(body.fullName ?? "").trim() || [body.firstName, body.lastName].map((x) => String(x ?? "").trim()).filter(Boolean).join(" ")).slice(0, 160);
  if (!fullName) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  const CATS = new Set<string>(Object.values(RecruitingCategory));
  const PROBS = new Set<string>(Object.values(ReferralProbability));

  const contact = await prisma.contact.create({
    data: {
      fullName,
      email: String(body.email ?? "") || `import+${Date.now()}@placeholder.local`,
      phone: body.phone ? String(body.phone) : null,
      linkedinUrl: linkedin,
      firmId,
      group: String(body.group ?? ""),
      title: String(body.title ?? ""),
      location: String(body.location ?? ""),
      school: String(body.school ?? ""),
      recruitingCategory: (CATS.has(String(body.recruitingCategory)) ? body.recruitingCategory : "IB") as RecruitingCategory,
      relationshipStrength: Number(body.relationshipStrength ?? 1) || 1,
      referralProbability: (PROBS.has(String(body.referralProbability)) ? body.referralProbability : "MEDIUM") as ReferralProbability,
      notes: String(body.notes ?? ""),
      // "Last contacted" only ever comes from logged interactions, never from the create form.
      lastInteractionDate: null,
      priority: body.priority ? String(body.priority).charAt(0).toUpperCase() : null,
      tags: Array.isArray(body.tags) ? (body.tags as unknown[]).map(String).filter(Boolean) : [],
      userId,
      ...extendedContactCreateData(body),
      source: body.source ? String(body.source) : "manual",
      inOutreachQueue: Boolean(body.inOutreachQueue),
    },
  });
  return NextResponse.json(contact);
}
