import { NextResponse } from "next/server";
import { getUserIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeFirmName } from "@/lib/contact-match";
import { opportunityRoleFor } from "@/lib/openings";
import { visibleOpeningsWhere, openingsAccess } from "@/lib/openings-data";
import type { FirmType } from "@prisma/client";

const TRACK_FIRM_TYPE: Record<string, FirmType> = { IB: "IB", PE: "PE", VC: "VC", "Growth Equity": "GE", "Hedge Fund / Markets": "HF", Consulting: "CONSULTING", "Corporate Finance": "CORPORATE" };

/**
 * POST { action: "add" | "applied" }. Add creates a pipeline opportunity at Target with the deadline, role and link
 * filled in (using the member's own firm with that name, or a new one). Applied moves it to Applied (adding it first if needed).
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { action?: string };
  const action = body.action === "applied" ? "applied" : "add";
  const { memberClubIds } = await openingsAccess(userId);
  const opening = await prisma.opening.findFirst({ where: { id, ...visibleOpeningsWhere(memberClubIds, true) } });
  if (!opening) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let opp = await prisma.opportunity.findFirst({ where: { userId, openingId: id }, select: { id: true, stage: true } });
  if (!opp) {
    const firms = await prisma.firm.findMany({ where: { userId }, select: { id: true, name: true } });
    let firmId = firms.find((f) => normalizeFirmName(f.name) === opening.firmNorm)?.id;
    if (!firmId) {
      const created = await prisma.firm.upsert({
        where: { userId_name: { userId, name: opening.firmName } },
        update: {},
        create: { userId, name: opening.firmName, location: opening.city, focus: "", type: (opening.track && TRACK_FIRM_TYPE[opening.track]) || "OTHER" },
        select: { id: true },
      });
      firmId = created.id;
    }
    const notes = [opening.program, opening.link ? `Apply: ${opening.link}` : null, opening.notes].filter(Boolean).join("\n");
    opp = await prisma.opportunity.create({
      data: {
        userId,
        firmId,
        openingId: id,
        role: opportunityRoleFor(opening),
        stage: action === "applied" ? "APPLIED" : "TARGET",
        applicationDeadline: opening.deadline,
        group: opening.group,
        location: opening.city,
        notes,
      },
      select: { id: true, stage: true },
    });
  } else if (action === "applied" && opp.stage === "TARGET") {
    opp = await prisma.opportunity.update({ where: { id: opp.id }, data: { stage: "APPLIED" }, select: { id: true, stage: true } });
  }
  return NextResponse.json({ pipeline: opp });
}
