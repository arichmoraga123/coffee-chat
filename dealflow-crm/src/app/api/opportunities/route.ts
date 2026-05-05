import { NextResponse } from "next/server";
import { OpportunityStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { PIPELINE_STAGES } from "@/lib/constants";
import { parseFirmType } from "@/lib/firm-type";
import { syncOpportunityDeadlineToExternalCalendars } from "@/lib/calendar-sync";

const STAGE_SET = new Set<string>(PIPELINE_STAGES);

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  let firmId = typeof body.firmId === "string" ? body.firmId.trim() : "";
  if (firmId) {
    const firm = await prisma.firm.findFirst({
      where: { id: firmId, userId },
      select: { id: true },
    });
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
        location: "Unknown",
        focus: "Generalist",
        userId,
      },
      select: { id: true },
    });
    firmId = createdFirm.id;
  }

  const stage = String(body.stage ?? "");
  if (!STAGE_SET.has(stage)) {
    return NextResponse.json({ error: "Invalid stage." }, { status: 400 });
  }

  const role = String(body.role ?? "").trim();
  if (!role) return NextResponse.json({ error: "Role is required." }, { status: 400 });

  const opportunity = await prisma.opportunity.create({
    data: {
      userId,
      firmId,
      role,
      stage: stage as OpportunityStage,
      notes: String(body.notes ?? "").trim(),
      contactName: String(body.contactName ?? "").trim(),
      applicationDeadline: body.applicationDeadline
        ? new Date(String(body.applicationDeadline))
        : null,
    },
    include: { firm: true, contacts: { include: { contact: true } } },
  });

  void syncOpportunityDeadlineToExternalCalendars(userId, opportunity.id);

  return NextResponse.json(opportunity);
}
