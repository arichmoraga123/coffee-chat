import { NextResponse } from "next/server";
import { INTERACTION_KINDS, type InteractionKind } from "@/lib/followups";
import { recomputeLastInteraction } from "@/lib/bulk";
import { syncFollowupTasks } from "@/lib/followup-tasks";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { normalizeIntArray } from "@/lib/form-arrays";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;

  const existing = await prisma.interaction.findFirst({
    where: { id, userId },
    select: { id: true, actionItems: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if ("actionItemsChecked" in body) {
    const checked = normalizeIntArray(body.actionItemsChecked);
    const maxIdx = existing.actionItems.length - 1;
    const filtered = checked.filter((i) => i >= 0 && i <= maxIdx);
    const updated = await prisma.interaction.update({
      where: { id },
      data: { actionItemsChecked: filtered },
    });
    return NextResponse.json(updated);
  }

  // Editable fields from the contact timeline.
  const data: Record<string, unknown> = {};
  const str = (k: string) => (body[k] === null || body[k] === undefined ? undefined : String(body[k]).trim() || null);
  if (body.date !== undefined) {
    const d = new Date(String(body.date));
    if (isNaN(d.getTime())) return NextResponse.json({ error: "Invalid date." }, { status: 400 });
    data.date = d;
  }
  if (typeof body.kind === "string" && body.kind in INTERACTION_KINDS) {
    data.kind = body.kind;
    data.type = INTERACTION_KINDS[body.kind as InteractionKind].legacy;
  }
  for (const k of ["notes", "adviceGiven", "personalDetails", "nextStep"]) if (k in body) data[k] = str(k) ?? null;
  if ("nextStepDue" in body) data.nextStepDue = body.nextStepDue ? new Date(String(body.nextStepDue)) : null;
  if (!Object.keys(data).length) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  const updated = await prisma.interaction.update({ where: { id }, data });
  await recomputeLastInteraction([updated.contactId]);
  await syncFollowupTasks(userId, [updated.contactId]);
  return NextResponse.json(updated);
}
