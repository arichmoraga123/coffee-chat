import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { recomputeLastInteraction } from "@/lib/bulk";
import { syncFollowupTasks } from "@/lib/followup-tasks";

/**
 * Undo an import: soft-deletes the contacts it created and the interactions it added.
 * Contacts that already existed keep their record; only the interactions this import added are removed.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const batch = await prisma.importBatch.findFirst({ where: { id, userId } });
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (batch.status === "undone") return NextResponse.json({ error: "Already undone." }, { status: 409 });
  const now = new Date();
  const touched = await prisma.interaction.findMany({ where: { importBatchId: id, userId, deletedAt: null }, select: { id: true, contactId: true } });
  const [contacts, interactions] = await prisma.$transaction([
    prisma.contact.updateMany({ where: { importBatchId: id, userId, deletedAt: null }, data: { deletedAt: now } }),
    prisma.interaction.updateMany({ where: { importBatchId: id, userId, deletedAt: null }, data: { deletedAt: now } }),
    prisma.task.updateMany({ where: { userId, status: "PENDING", contact: { importBatchId: id } }, data: { dismissedAt: now } }),
    prisma.task.updateMany({ where: { userId, status: "PENDING", ruleKey: { in: touched.map((t) => `step:${t.id}`) } }, data: { dismissedAt: now } }),
    prisma.importBatch.update({ where: { id }, data: { status: "undone" } }),
  ]);
  const contactIds = [...new Set(touched.map((t) => t.contactId))];
  await recomputeLastInteraction(contactIds);
  await syncFollowupTasks(userId, contactIds);
  return NextResponse.json({ contacts: contacts.count, interactions: interactions.count });
}
