import "server-only";
import { prisma } from "@/lib/prisma";
import { INTERACTION_KINDS, kindOf, nextFollowup, stageFromKind } from "@/lib/followups";

export type ContactListRow = {
  id: string;
  fullName: string;
  firmId: string;
  firmName: string;
  title: string;
  group: string;
  email: string;
  school: string;
  track: string;
  stage: string;
  priority: string | null;
  tags: string[];
  list: string;
  doNotContact: boolean;
  lastContacted: string | null;
  lastSnippet: string | null;
  next: { label: string; reason: string; due: string; overdue: boolean; draft: string | null } | null;
  goneCold: boolean;
  importSource: string | null;
  searchText: string;
  deletedAt: string | null;
};

/** Contacts for one view (active / network / trash), with follow-up, last-conversation snippet, and search text. */
export async function contactListRows(userId: string, view: "active" | "network" | "trash"): Promise<ContactListRow[]> {
  const where =
    view === "trash" ? { userId, deletedAt: { not: null } } : { userId, deletedAt: null, list: view === "network" ? "network" : "active" };
  const contacts = await prisma.contact.findMany({
    where,
    orderBy: [{ lastInteractionDate: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: 5000,
    select: {
      id: true, fullName: true, firmId: true, title: true, group: true, email: true, school: true, notes: true, tags: true, list: true,
      doNotContact: true, notPursuing: true, deletedAt: true, priority: true, relationshipStage: true, recruitingCategory: true, source: true,
      firm: { select: { name: true } },
      importBatch: { select: { source: true } },
      interactions: {
        where: { deletedAt: null, autoCreated: false },
        orderBy: { date: "desc" },
        take: 12,
        select: { id: true, date: true, kind: true, type: true, notes: true, adviceGiven: true, nextStep: true, nextStepDue: true },
      },
    },
  });
  const now = Date.now();
  return contacts.map((c) => {
    const ixs = c.interactions.map((i) => ({ ...i, k: kindOf(i) }));
    const last = ixs[0];
    const r = nextFollowup(c, ixs.map((i) => ({ id: i.id, date: i.date, kind: i.k, nextStep: i.nextStep, nextStepDue: i.nextStepDue })));
    const snippet = last
      ? `${INTERACTION_KINDS[last.k].label} · ${last.date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}${last.notes ? ` — ${last.notes.slice(0, 90)}${last.notes.length > 90 ? "…" : ""}` : ""}`
      : null;
    return {
      id: c.id,
      fullName: c.fullName,
      firmId: c.firmId,
      firmName: c.firm.name,
      title: c.title,
      group: c.group,
      email: c.email.endsWith("@placeholder.local") ? "" : c.email,
      school: c.school,
      track: c.recruitingCategory,
      stage: c.notPursuing ? "Not pursuing" : r.goneCold ? "Gone cold" : (c.relationshipStage ?? stageFromKind(last?.k ?? null)),
      priority: c.priority,
      tags: c.tags,
      list: c.list,
      doNotContact: c.doNotContact,
      lastContacted: last?.date.toISOString() ?? null,
      lastSnippet: snippet,
      next: r.followup
        ? { label: r.followup.label, reason: r.followup.reason, due: r.followup.due.toISOString(), overdue: r.followup.due.getTime() < now - 86_400_000, draft: r.followup.draft }
        : null,
      goneCold: r.goneCold,
      importSource: c.importBatch?.source ?? (c.source === "import" ? "csv" : c.source === "linkedin" ? "linkedin" : null),
      searchText: [c.fullName, c.firm.name, c.title, c.group, c.email, c.school, c.tags.join(" "), c.notes, ...ixs.map((i) => `${i.notes ?? ""} ${i.adviceGiven ?? ""}`)].join(" ").toLowerCase(),
      deletedAt: c.deletedAt?.toISOString() ?? null,
    };
  });
}
