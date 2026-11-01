import type { PrismaClient } from "@prisma/client";
import { kindOf, stageFromKind } from "@/lib/followups";

/**
 * Phase H.5 — fixes what the old importer did: it copied LinkedIn's "Connected On" (or any "date" column) into
 * lastInteractionDate, so every imported contact looked contacted on that day and showed as Overdue.
 * Also removes importer-created interactions with no notes created within a minute of the contact itself.
 */

export type RepairPlan = {
  userId: string;
  email: string;
  interactionsToRemove: string[];
  datesToReset: { contactId: string; from: Date | null; to: Date | null }[];
  networkCandidates: string[];
};

const IMPORT_SOURCES = new Set(["import", "linkedin"]);

export async function planRepair(db: PrismaClient, userId?: string): Promise<RepairPlan[]> {
  const users = await db.user.findMany({ where: userId ? { id: userId } : {}, select: { id: true, email: true } });
  const plans: RepairPlan[] = [];
  for (const u of users) {
    const contacts = await db.contact.findMany({
      where: { userId: u.id, deletedAt: null },
      select: {
        id: true,
        source: true,
        createdAt: true,
        linkedinUrl: true,
        list: true,
        lastInteractionDate: true,
        importBatch: { select: { source: true } },
        interactions: { where: { deletedAt: null }, select: { id: true, date: true, notes: true, adviceGiven: true, createdAt: true, autoCreated: true } },
      },
    });
    const plan: RepairPlan = { userId: u.id, email: u.email, interactionsToRemove: [], datesToReset: [], networkCandidates: [] };
    for (const c of contacts) {
      const imported = IMPORT_SOURCES.has(c.source ?? "") || Boolean(c.importBatch);
      const fake = c.interactions.filter(
        (i) =>
          i.autoCreated ||
          (imported && !i.notes?.trim() && !i.adviceGiven?.trim() && Math.abs(i.createdAt.getTime() - c.createdAt.getTime()) < 60_000),
      );
      plan.interactionsToRemove.push(...fake.map((i) => i.id));
      const real = c.interactions.filter((i) => !fake.includes(i));
      const latest = real.reduce<Date | null>((m, i) => (!m || i.date > m ? i.date : m), null);
      const cur = c.lastInteractionDate;
      if ((cur?.getTime() ?? null) !== (latest?.getTime() ?? null)) plan.datesToReset.push({ contactId: c.id, from: cur, to: latest });
      const fromLinkedIn = c.importBatch?.source === "linkedin" || c.source === "linkedin" || (c.source === "import" && Boolean(c.linkedinUrl));
      if (fromLinkedIn && c.list !== "network" && real.length === 0) plan.networkCandidates.push(c.id);
    }
    if (plan.interactionsToRemove.length || plan.datesToReset.length || plan.networkCandidates.length) plans.push(plan);
  }
  return plans;
}

/** Applies the date repair (not the Network move). Interactions are soft-deleted and flagged, never hard-deleted. */
export async function applyRepair(db: PrismaClient, plan: RepairPlan) {
  await db.$transaction(async (tx) => {
    if (plan.interactionsToRemove.length) {
      await tx.interaction.updateMany({ where: { id: { in: plan.interactionsToRemove }, userId: plan.userId }, data: { autoCreated: true, deletedAt: new Date() } });
    }
    for (const d of plan.datesToReset) {
      const latest = await tx.interaction.findFirst({
        where: { contactId: d.contactId, deletedAt: null, autoCreated: false },
        orderBy: { date: "desc" },
        select: { date: true, kind: true, type: true, notes: true },
      });
      await tx.contact.update({
        where: { id: d.contactId },
        data: { lastInteractionDate: latest?.date ?? null, relationshipStage: stageFromKind(latest ? kindOf(latest) : null) },
      });
    }
  });
}

export async function moveToNetwork(db: PrismaClient, userId: string, contactIds: string[]) {
  const r = await db.contact.updateMany({ where: { id: { in: contactIds }, userId }, data: { list: "network" } });
  return r.count;
}
