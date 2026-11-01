import { prisma } from "@/lib/prisma";
import { INTERACTION_KINDS, kindOf } from "@/lib/followups";

/** One source for the Tasks page, the Home "This week" card, the sidebar badge and the daily digest. */

export type TaskRow = {
  id: string;
  contactId: string;
  contactName: string;
  firmName: string;
  /** yyyy-mm-dd (dates are stored as UTC midnight) */
  due: string;
  title: string;
  detail: string | null;
  kind: string;
  taskType: string;
  snoozed: boolean;
  done: "completed" | "dismissed" | null;
  closedAt: string | null;
  lastSnippet: string | null;
  advice: string | null;
  /** Email writer type for "Draft email", or null when there's nothing to write. */
  draft: string | null;
};

const TYPE_TITLE: Record<string, string> = { FOLLOW_UP: "Follow up", THANK_YOU: "Send a thank-you", CHECK_IN: "Check in", APPLY: "Apply" };

function draftFor(ruleKey: string | null, taskType: string): string | null {
  const rule = ruleKey?.split(":")[0] ?? "";
  if (rule === "bump1" || rule === "bump2") return "bump";
  if (rule === "thank_you" || taskType === "THANK_YOU") return "thank-you";
  if (taskType === "APPLY") return null;
  return "follow-up";
}

const openWhere = (userId: string) => ({ userId, status: "PENDING" as const, dismissedAt: null, contact: { deletedAt: null } });

/** Overdue + due today (UTC), for the sidebar badge. */
export async function tasksDueCount(userId: string) {
  const tomorrow = new Date(new Date().toISOString().slice(0, 10));
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return prisma.task.count({ where: { ...openWhere(userId), dueDate: { lt: tomorrow } } });
}

export async function loadTasks(userId: string, opts: { includeDone?: boolean; dueBefore?: Date; take?: number } = {}): Promise<TaskRow[]> {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [open, closed] = await Promise.all([
    prisma.task.findMany({
      where: { ...openWhere(userId), ...(opts.dueBefore ? { dueDate: { lt: opts.dueBefore } } : {}) },
      orderBy: { dueDate: "asc" },
      take: opts.take ?? 500,
      include: taskInclude,
    }),
    opts.includeDone
      ? prisma.task.findMany({
          where: { userId, contact: { deletedAt: null }, OR: [{ status: "COMPLETED", completedAt: { gte: since } }, { dismissedAt: { gte: since } }] },
          orderBy: [{ completedAt: "desc" }, { dismissedAt: "desc" }],
          take: 50,
          include: taskInclude,
        })
      : Promise.resolve([]),
  ]);
  return [...open, ...closed].map((t) => {
    const last = t.contact.interactions[0];
    const withAdvice = t.contact.interactions.find((i) => i.adviceGiven?.trim());
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
    const reason = t.reason ?? "";
    const cut = reason.lastIndexOf(" — ");
    const title = cut >= 0 ? reason.slice(0, cut) : reason;
    const rest = cut >= 0 ? [reason.slice(cut + 3)] : [];
    return {
      id: t.id,
      contactId: t.contactId,
      contactName: t.contact.fullName,
      firmName: t.contact.firm.name,
      due: t.dueDate.toISOString().slice(0, 10),
      title: title || TYPE_TITLE[t.taskType] || "Follow up",
      detail: rest.join(" — ") || (t.kind === "manual" && t.notes && !t.reason ? t.notes : null),
      kind: t.kind,
      taskType: t.taskType,
      snoozed: Boolean(t.snoozedUntil),
      done: t.dismissedAt ? "dismissed" : t.status === "COMPLETED" ? "completed" : null,
      closedAt: (t.dismissedAt ?? t.completedAt)?.toISOString() ?? null,
      lastSnippet: last ? `${INTERACTION_KINDS[kindOf(last)].label} · ${fmt(last.date)}${last.notes ? ` — ${last.notes.slice(0, 160)}` : ""}` : null,
      advice: withAdvice?.adviceGiven?.slice(0, 200) ?? null,
      draft: draftFor(t.ruleKey, t.taskType),
    };
  });
}

const taskInclude = {
  contact: {
    select: {
      fullName: true,
      firm: { select: { name: true } },
      interactions: {
        where: { deletedAt: null, autoCreated: false },
        orderBy: { date: "desc" as const },
        take: 5,
        select: { date: true, kind: true, type: true, notes: true, adviceGiven: true },
      },
    },
  },
};
