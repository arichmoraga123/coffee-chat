import type { TaskType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { kindOf, nextFollowup, type FollowupKind } from "@/lib/followups";

const TASK_TYPE: Record<FollowupKind, TaskType> = {
  bump1: "FOLLOW_UP",
  bump2: "FOLLOW_UP",
  reply: "FOLLOW_UP",
  thank_you: "THANK_YOU",
  update: "FOLLOW_UP",
  check_in: "CHECK_IN",
  referral_check: "CHECK_IN",
  event_followup: "FOLLOW_UP",
  next_step: "FOLLOW_UP",
};

/**
 * Turns the follow-up rules into Task rows: one open automatic task per contact. When the situation changes
 * (a new interaction), the old automatic task closes and the new one opens. Dismissed or completed reminders
 * for the same situation are never recreated. Snoozed tasks keep their snoozed date.
 */
export async function syncFollowupTasks(userId: string, contactIds?: string[]) {
  const contacts = await prisma.contact.findMany({
    where: { userId, ...(contactIds ? { id: { in: contactIds } } : {}) },
    select: {
      id: true,
      list: true,
      doNotContact: true,
      notPursuing: true,
      deletedAt: true,
      priority: true,
      interactions: {
        where: { deletedAt: null, autoCreated: false },
        select: { id: true, date: true, kind: true, type: true, notes: true, nextStep: true, nextStepDue: true },
      },
      tasks: { where: { kind: { in: ["followup", "next_step"] } }, select: { id: true, ruleKey: true, status: true, dismissedAt: true, snoozedUntil: true, dueDate: true } },
    },
  });
  let created = 0;
  for (const c of contacts) {
    const r = nextFollowup(
      c,
      c.interactions.map((i) => ({ id: i.id, date: i.date, kind: kindOf(i), nextStep: i.nextStep, nextStepDue: i.nextStepDue })),
    );
    const want = r.followup;
    const open = c.tasks.filter((t) => t.status === "PENDING" && !t.dismissedAt);
    // Close automatic tasks for situations that no longer apply.
    const stale = open.filter((t) => t.ruleKey !== want?.ruleKey).map((t) => t.id);
    if (stale.length) await prisma.task.updateMany({ where: { id: { in: stale } }, data: { status: "COMPLETED", completedAt: new Date(), reason: "Superseded by a newer interaction" } });
    if (!want) continue;
    const existing = c.tasks.find((t) => t.ruleKey === want.ruleKey);
    if (existing) {
      if (existing.status === "PENDING" && !existing.dismissedAt && !existing.snoozedUntil && existing.dueDate.getTime() !== want.due.getTime()) {
        await prisma.task.update({ where: { id: existing.id }, data: { dueDate: want.due, reason: want.reason } });
      }
      continue;
    }
    await prisma.task.create({
      data: {
        userId,
        contactId: c.id,
        dueDate: want.due,
        taskType: TASK_TYPE[want.kind],
        kind: want.kind === "next_step" ? "next_step" : "followup",
        ruleKey: want.ruleKey,
        reason: `${want.label} — ${want.reason}`,
        notes: want.draft ?? "",
      },
    }).catch(() => null); // a concurrent sync created it
    created++;
  }
  return { checked: contacts.length, created };
}
