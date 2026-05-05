import { NextResponse } from "next/server";
import { OpportunityStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { PIPELINE_STAGES } from "@/lib/constants";
import { parseFirmType } from "@/lib/firm-type";
import { syncOpportunityDeadlineToExternalCalendars } from "@/lib/calendar-sync";

const STAGE_SET = new Set<string>(PIPELINE_STAGES);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const existing = await prisma.opportunity.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: {
    stage?: OpportunityStage;
    role?: string;
    notes?: string;
    contactName?: string;
    applicationDeadline?: Date | null;
    firmId?: string;
  } = {};

  if (body.stage !== undefined) {
    const stage = String(body.stage);
    if (!STAGE_SET.has(stage)) {
      return NextResponse.json({ error: "Invalid stage." }, { status: 400 });
    }
    data.stage = stage as OpportunityStage;
  }

  if (body.role !== undefined) {
    const role = String(body.role).trim();
    if (!role) return NextResponse.json({ error: "Role is required." }, { status: 400 });
    data.role = role;
  }

  if (body.notes !== undefined) data.notes = String(body.notes);
  if (body.contactName !== undefined) data.contactName = String(body.contactName).trim();

  if (body.applicationDeadline !== undefined) {
    data.applicationDeadline = body.applicationDeadline
      ? new Date(String(body.applicationDeadline))
      : null;
  }

  if (body.firmId !== undefined || body.firmName !== undefined) {
    let firmId = typeof body.firmId === "string" ? body.firmId.trim() : "";
    if (firmId) {
      const firm = await prisma.firm.findFirst({
        where: { id: firmId, userId },
        select: { id: true },
      });
      if (!firm) return NextResponse.json({ error: "Invalid firm." }, { status: 400 });
      data.firmId = firmId;
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
      data.firmId = createdFirm.id;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const opp = await prisma.opportunity.update({
    where: { id },
    data,
    include: { firm: true, contacts: { include: { contact: true } } },
  });
  void syncOpportunityDeadlineToExternalCalendars(userId, opp.id);
  return NextResponse.json(opp);
}
