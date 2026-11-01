import "server-only";
import { Prisma, type OpportunityStage, type Priority, type TaskStatus, type FirmType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PIPELINE_STAGES } from "@/lib/constants";
import { FIRM_TYPE_ORDER } from "@/lib/firm-type";
import { RELATIONSHIP_STAGES } from "@/lib/followups";
import { backfillRoster } from "@/lib/club-roster";

/**
 * Shared bulk editing (Phase G.2b). Every change runs in one transaction, scoped to records the user owns
 * (or the club for admins), and returns an undo snapshot the client can send back within 10 seconds.
 */
export type BulkEntity = "contacts" | "firms" | "opportunities" | "tasks" | "interactions" | "roster" | "questions" | "mentor-questions";
export type BulkRequest =
  | { entity: BulkEntity; ids: string[]; op: "set"; field: string; value: unknown; tagMode?: "add" | "remove" }
  | { entity: BulkEntity; ids: string[]; op: "action"; action: string; value?: unknown };
export type Undo = { entity: BulkEntity; rows: { id: string; data: Record<string, unknown> }[]; recreate?: Record<string, unknown>[] };
export type BulkResult = { count: number; undo: Undo | null; message?: string };

type Ctx = { userId: string; isAdmin: boolean };
const err = (message: string) => Object.assign(new Error(message), { status: 400 });

function pickFields<T extends Record<string, unknown>>(row: T, fields: string[]) {
  return Object.fromEntries(fields.map((f) => [f, row[f]])) as Record<string, unknown>;
}

const ENUMS = {
  stage: new Set<string>(PIPELINE_STAGES),
  priority: new Set(["HIGH", "MEDIUM", "LOW"]),
  firmType: new Set<string>(FIRM_TYPE_ORDER),
  taskStatus: new Set(["PENDING", "COMPLETED"]),
};

function asDate(v: unknown): Date | null {
  if (v === null || v === "") return null;
  const d = new Date(String(v));
  if (isNaN(d.getTime())) throw err("That isn't a valid date.");
  return d;
}

export async function runBulk(ctx: Ctx, req: BulkRequest): Promise<BulkResult> {
  const ids = [...new Set(req.ids)].slice(0, 5000);
  if (!ids.length) throw err("Nothing selected.");
  const { userId } = ctx;

  switch (req.entity) {
    case "contacts": {
      const owned = await prisma.contact.findMany({ where: { id: { in: ids }, userId } });
      const okIds = owned.map((c) => c.id);
      if (req.op === "set") {
        const FIELDS: Record<string, (v: unknown) => Prisma.ContactUpdateManyMutationInput | "tags"> = {
          relationshipStage: (v) => {
            if (v && !RELATIONSHIP_STAGES.includes(String(v))) throw err("Unknown stage.");
            return { relationshipStage: v ? String(v) : null };
          },
          priority: (v) => ({ priority: v ? String(v).charAt(0).toUpperCase() : null }),
          title: (v) => ({ title: String(v ?? "").trim() }),
          group: (v) => ({ group: String(v ?? "").trim() }),
          location: (v) => ({ location: String(v ?? "").trim() }),
          school: (v) => ({ school: String(v ?? "").trim() }),
          warmthScore: (v) => ({ warmthScore: String(v) }),
          list: (v) => ({ list: v === "network" ? "network" : "active" }),
          doNotContact: (v) => ({ doNotContact: Boolean(v) }),
          tags: () => "tags",
        };
        const make = FIELDS[req.field];
        if (!make && req.field !== "firmId") throw err("That field can't be bulk edited.");
        const prevFields = req.field === "firmId" ? ["firmId"] : [req.field];
        const undo: Undo = { entity: "contacts", rows: owned.map((c) => ({ id: c.id, data: pickFields(c as unknown as Record<string, unknown>, prevFields) })) };
        if (req.field === "firmId") {
          const firm = await prisma.firm.findFirst({ where: { id: String(req.value), userId }, select: { id: true } });
          if (!firm) throw err("Pick one of your firms.");
          const r = await prisma.contact.updateMany({ where: { id: { in: okIds } }, data: { firmId: firm.id } });
          return { count: r.count, undo };
        }
        const data = make(req.value);
        if (data === "tags") {
          const tags = (Array.isArray(req.value) ? req.value : [req.value]).map((t) => String(t).trim()).filter(Boolean);
          await prisma.$transaction(
            owned.map((c) =>
              prisma.contact.update({
                where: { id: c.id },
                data: { tags: req.tagMode === "remove" ? c.tags.filter((t) => !tags.includes(t)) : [...new Set([...c.tags, ...tags])] },
              }),
            ),
          );
          return { count: owned.length, undo };
        }
        const r = await prisma.contact.updateMany({ where: { id: { in: okIds } }, data });
        return { count: r.count, undo };
      }
      // actions
      const snapshot = (fields: string[]): Undo => ({ entity: "contacts", rows: owned.map((c) => ({ id: c.id, data: pickFields(c as unknown as Record<string, unknown>, fields) })) });
      switch (req.action) {
        case "delete": {
          const undo = snapshot(["deletedAt"]);
          const r = await prisma.$transaction(async (tx) => {
            const r = await tx.contact.updateMany({ where: { id: { in: okIds } }, data: { deletedAt: new Date() } });
            // A deleted contact's reminders stop immediately.
            await tx.task.updateMany({ where: { contactId: { in: okIds }, status: "PENDING", dismissedAt: null }, data: { dismissedAt: new Date() } });
            return r;
          });
          return { count: r.count, undo };
        }
        case "restore": {
          const r = await prisma.contact.updateMany({ where: { id: { in: okIds } }, data: { deletedAt: null } });
          return { count: r.count, undo: snapshot(["deletedAt"]) };
        }
        case "purge": {
          const r = await prisma.contact.deleteMany({ where: { id: { in: okIds }, deletedAt: { not: null } } });
          return { count: r.count, undo: null };
        }
        case "network":
          return { count: (await prisma.contact.updateMany({ where: { id: { in: okIds } }, data: { list: "network" } })).count, undo: snapshot(["list"]) };
        case "activate":
          return { count: (await prisma.contact.updateMany({ where: { id: { in: okIds } }, data: { list: "active" } })).count, undo: snapshot(["list"]) };
        case "dnc":
          return { count: (await prisma.contact.updateMany({ where: { id: { in: okIds } }, data: { doNotContact: true } })).count, undo: snapshot(["doNotContact"]) };
        default:
          throw err("Unknown action.");
      }
    }

    case "firms": {
      const owned = await prisma.firm.findMany({ where: { id: { in: ids }, userId } });
      const okIds = owned.map((f) => f.id);
      if (req.op === "set") {
        const undo: Undo = { entity: "firms", rows: owned.map((f) => ({ id: f.id, data: pickFields(f as unknown as Record<string, unknown>, [req.field]) })) };
        if (req.field === "type") {
          if (!ENUMS.firmType.has(String(req.value))) throw err("Unknown firm type.");
          return { count: (await prisma.firm.updateMany({ where: { id: { in: okIds } }, data: { type: req.value as FirmType } })).count, undo };
        }
        if (req.field === "location" || req.field === "focus") {
          return { count: (await prisma.firm.updateMany({ where: { id: { in: okIds } }, data: { [req.field]: String(req.value ?? "").trim() } })).count, undo };
        }
        throw err("That field can't be bulk edited.");
      }
      if (req.action === "merge") {
        // Keep one firm; move every contact and opportunity from the others onto it.
        const keep = String(req.value ?? "");
        if (!okIds.includes(keep)) throw err("Pick which firm to keep.");
        const others = okIds.filter((x) => x !== keep);
        await prisma.$transaction([
          prisma.contact.updateMany({ where: { firmId: { in: others } }, data: { firmId: keep } }),
          prisma.opportunity.updateMany({ where: { firmId: { in: others } }, data: { firmId: keep } }),
          prisma.firm.deleteMany({ where: { id: { in: others } } }),
        ]);
        return { count: others.length, undo: null, message: `Merged ${others.length} firm${others.length === 1 ? "" : "s"}` };
      }
      if (req.action === "delete") {
        // Only empty firms can be removed; anything with contacts or opportunities should be merged instead.
        const busy = await prisma.firm.findMany({ where: { id: { in: okIds }, OR: [{ contacts: { some: { deletedAt: null } } }, { opportunities: { some: {} } }] }, select: { id: true } });
        const removable = okIds.filter((x) => !busy.some((b) => b.id === x));
        const rows = owned.filter((f) => removable.includes(f.id));
        await prisma.firm.deleteMany({ where: { id: { in: removable } } });
        return {
          count: removable.length,
          undo: { entity: "firms", rows: [], recreate: rows as unknown as Record<string, unknown>[] },
          message: busy.length ? `${busy.length} firm${busy.length === 1 ? " has" : "s have"} contacts or opportunities — merge those instead` : undefined,
        };
      }
      throw err("Unknown action.");
    }

    case "opportunities": {
      const owned = await prisma.opportunity.findMany({ where: { id: { in: ids }, userId } });
      const okIds = owned.map((o) => o.id);
      if (req.op === "set") {
        const undo: Undo = { entity: "opportunities", rows: owned.map((o) => ({ id: o.id, data: pickFields(o as unknown as Record<string, unknown>, [req.field]) })) };
        const v = req.value;
        let data: Prisma.OpportunityUpdateManyMutationInput;
        if (req.field === "stage") {
          if (!ENUMS.stage.has(String(v))) throw err("Unknown stage.");
          data = { stage: v as OpportunityStage };
        } else if (req.field === "priority") {
          if (!ENUMS.priority.has(String(v))) throw err("Unknown priority.");
          data = { priority: v as Priority };
        } else if (req.field === "role") data = { role: String(v ?? "").trim() };
        else if (req.field === "group") data = { group: String(v ?? "").trim() || null };
        else if (req.field === "location") data = { location: String(v ?? "").trim() || null };
        else if (req.field === "applicationDeadline") data = { applicationDeadline: asDate(v) };
        else if (req.field === "firmId") {
          const firm = await prisma.firm.findFirst({ where: { id: String(v), userId }, select: { id: true } });
          if (!firm) throw err("Pick one of your firms.");
          return { count: (await prisma.opportunity.updateMany({ where: { id: { in: okIds } }, data: { firmId: firm.id } })).count, undo };
        } else throw err("That field can't be bulk edited.");
        return { count: (await prisma.opportunity.updateMany({ where: { id: { in: okIds } }, data })).count, undo };
      }
      if (req.action === "delete") {
        await prisma.opportunity.deleteMany({ where: { id: { in: okIds } } });
        return { count: okIds.length, undo: { entity: "opportunities", rows: [], recreate: owned as unknown as Record<string, unknown>[] } };
      }
      throw err("Unknown action.");
    }

    case "tasks": {
      const owned = await prisma.task.findMany({ where: { id: { in: ids }, userId } });
      const okIds = owned.map((t) => t.id);
      const snap = (fields: string[]): Undo => ({ entity: "tasks", rows: owned.map((t) => ({ id: t.id, data: pickFields(t as unknown as Record<string, unknown>, fields) })) });
      if (req.op === "set") {
        if (req.field === "dueDate") {
          const d = asDate(req.value);
          if (!d) throw err("Pick a date.");
          return { count: (await prisma.task.updateMany({ where: { id: { in: okIds } }, data: { dueDate: d, snoozedUntil: null } })).count, undo: snap(["dueDate", "snoozedUntil"]) };
        }
        if (req.field === "status") {
          if (!ENUMS.taskStatus.has(String(req.value))) throw err("Unknown status.");
          return {
            count: (await prisma.task.updateMany({ where: { id: { in: okIds } }, data: { status: req.value as TaskStatus, completedAt: req.value === "COMPLETED" ? new Date() : null } })).count,
            undo: snap(["status", "completedAt"]),
          };
        }
        if (req.field === "notes") return { count: (await prisma.task.updateMany({ where: { id: { in: okIds } }, data: { notes: String(req.value ?? "") } })).count, undo: snap(["notes"]) };
        throw err("That field can't be bulk edited.");
      }
      switch (req.action) {
        case "done":
          return { count: (await prisma.task.updateMany({ where: { id: { in: okIds } }, data: { status: "COMPLETED", completedAt: new Date() } })).count, undo: snap(["status", "completedAt"]) };
        case "snooze": {
          const until = asDate(req.value);
          if (!until) throw err("Pick a date.");
          return { count: (await prisma.task.updateMany({ where: { id: { in: okIds } }, data: { snoozedUntil: until, dueDate: until } })).count, undo: snap(["snoozedUntil", "dueDate"]) };
        }
        case "dismiss":
        case "delete":
          return { count: (await prisma.task.updateMany({ where: { id: { in: okIds } }, data: { dismissedAt: new Date() } })).count, undo: snap(["dismissedAt"]) };
        default:
          throw err("Unknown action.");
      }
    }

    case "interactions": {
      const owned = await prisma.interaction.findMany({ where: { id: { in: ids }, userId } });
      const okIds = owned.map((i) => i.id);
      if (req.op === "action" && req.action === "delete") {
        await prisma.interaction.updateMany({ where: { id: { in: okIds } }, data: { deletedAt: new Date() } });
        await recomputeLastInteraction([...new Set(owned.map((i) => i.contactId))]);
        return { count: okIds.length, undo: { entity: "interactions", rows: owned.map((i) => ({ id: i.id, data: { deletedAt: null } })) } };
      }
      throw err("Unknown action.");
    }

    case "roster": {
      if (!ctx.isAdmin) throw Object.assign(new Error("Admins only."), { status: 403 });
      const entries = await prisma.clubRosterEntry.findMany({ where: { id: { in: ids } } });
      const okIds = entries.map((e) => e.id);
      const snap = (fields: string[]): Undo => ({ entity: "roster", rows: entries.map((e) => ({ id: e.id, data: pickFields(e as unknown as Record<string, unknown>, fields) })) });
      let undo: Undo;
      if (req.op === "set" && req.field === "role") {
        if (!["member", "officer", "admin"].includes(String(req.value))) throw err("Unknown role.");
        undo = snap(["role"]);
        await prisma.clubRosterEntry.updateMany({ where: { id: { in: okIds } }, data: { role: String(req.value) } });
      } else if (req.op === "action" && (req.action === "deactivate" || req.action === "reactivate")) {
        undo = snap(["active"]);
        await prisma.clubRosterEntry.updateMany({ where: { id: { in: okIds } }, data: { active: req.action === "reactivate" } });
      } else throw err("Unknown action.");
      await backfillRoster(entries.map((e) => e.email));
      return { count: okIds.length, undo };
    }

    case "questions": {
      if (!ctx.isAdmin) throw Object.assign(new Error("Admins only."), { status: 403 });
      const rows = await prisma.question.findMany({ where: { id: { in: ids } } });
      const okIds = rows.map((r) => r.id);
      const snap = (fields: string[]): Undo => ({ entity: "questions", rows: rows.map((q) => ({ id: q.id, data: pickFields(q as unknown as Record<string, unknown>, fields) })) });
      if (req.op === "set" && ["status", "difficulty", "category"].includes(req.field)) {
        if (req.field === "status" && !["active", "pending", "rejected", "archived"].includes(String(req.value))) throw err("Unknown status.");
        if (req.field === "difficulty" && !["Easy", "Medium", "Hard"].includes(String(req.value))) throw err("Unknown difficulty.");
        const undo = snap([req.field]);
        return { count: (await prisma.question.updateMany({ where: { id: { in: okIds } }, data: { [req.field]: String(req.value) } })).count, undo };
      }
      if (req.op === "action" && req.action === "delete") {
        // Soft: archived questions disappear from every list but keep students' history.
        return { count: (await prisma.question.updateMany({ where: { id: { in: okIds } }, data: { status: "archived" } })).count, undo: snap(["status"]) };
      }
      throw err("Unknown action.");
    }

    case "mentor-questions": {
      if (!ctx.isAdmin) throw Object.assign(new Error("Admins only."), { status: 403 });
      const rows = await prisma.mentorQuestion.findMany({ where: { id: { in: ids } } });
      const okIds = rows.map((r) => r.id);
      if (req.op === "set" && req.field === "public") {
        const undo: Undo = { entity: "mentor-questions", rows: rows.map((q) => ({ id: q.id, data: { public: q.public } })) };
        return { count: (await prisma.mentorQuestion.updateMany({ where: { id: { in: okIds } }, data: { public: Boolean(req.value) } })).count, undo };
      }
      if (req.op === "action" && req.action === "close") {
        const undo: Undo = { entity: "mentor-questions", rows: rows.map((q) => ({ id: q.id, data: { status: q.status } })) };
        return { count: (await prisma.mentorQuestion.updateMany({ where: { id: { in: okIds } }, data: { status: "closed" } })).count, undo };
      }
      throw err("Unknown action.");
    }
  }
}

const UNDO_FIELDS: Record<BulkEntity, string[]> = {
  contacts: ["relationshipStage", "priority", "title", "group", "location", "school", "warmthScore", "list", "doNotContact", "tags", "firmId", "deletedAt"],
  firms: ["type", "location", "focus"],
  opportunities: ["stage", "priority", "role", "group", "location", "applicationDeadline", "firmId"],
  tasks: ["dueDate", "status", "completedAt", "snoozedUntil", "dismissedAt", "notes"],
  interactions: ["deletedAt"],
  roster: ["role", "active"],
  questions: ["status", "difficulty", "category"],
  "mentor-questions": ["public", "status"],
};

/** Puts the previous values back. Only whitelisted fields, only records the user owns. */
export async function runUndo(ctx: Ctx, undo: Undo): Promise<number> {
  const allowed = new Set(UNDO_FIELDS[undo.entity] ?? []);
  const { userId } = ctx;
  const clean = (data: Record<string, unknown>) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
      if (!allowed.has(k)) continue;
      out[k] = typeof v === "string" && /^(deletedAt|completedAt|snoozedUntil|dismissedAt|dueDate|applicationDeadline)$/.test(k) ? new Date(v) : v;
    }
    return out;
  };
  let n = 0;
  await prisma.$transaction(async (tx) => {
    for (const r of undo.rows.slice(0, 5000)) {
      const data = clean(r.data);
      if (!Object.keys(data).length) continue;
      switch (undo.entity) {
        case "contacts":
          n += (await tx.contact.updateMany({ where: { id: r.id, userId }, data })).count;
          break;
        case "firms":
          n += (await tx.firm.updateMany({ where: { id: r.id, userId }, data })).count;
          break;
        case "opportunities":
          n += (await tx.opportunity.updateMany({ where: { id: r.id, userId }, data })).count;
          break;
        case "tasks":
          n += (await tx.task.updateMany({ where: { id: r.id, userId }, data })).count;
          break;
        case "interactions":
          n += (await tx.interaction.updateMany({ where: { id: r.id, userId }, data })).count;
          break;
        case "roster":
          if (ctx.isAdmin) n += (await tx.clubRosterEntry.updateMany({ where: { id: r.id }, data })).count;
          break;
        case "questions":
          if (ctx.isAdmin) n += (await tx.question.updateMany({ where: { id: r.id }, data })).count;
          break;
        case "mentor-questions":
          if (ctx.isAdmin) n += (await tx.mentorQuestion.updateMany({ where: { id: r.id }, data })).count;
          break;
      }
    }
    // Hard deletes (opportunities, empty firms) come back as new rows with the same ids.
    for (const row of (undo.recreate ?? []).slice(0, 2000)) {
      if (row.userId !== userId) continue;
      if (undo.entity === "opportunities") {
        const o = row as Record<string, unknown>;
        await tx.opportunity.create({
          data: {
            id: String(o.id), userId, firmId: String(o.firmId), role: String(o.role), stage: o.stage as OpportunityStage, priority: o.priority as Priority,
            notes: String(o.notes ?? ""), contactName: String(o.contactName ?? ""), group: (o.group as string) ?? null, location: (o.location as string) ?? null,
            applicationDeadline: o.applicationDeadline ? new Date(String(o.applicationDeadline)) : null, createdAt: o.createdAt ? new Date(String(o.createdAt)) : undefined,
          },
        });
        n++;
      } else if (undo.entity === "firms") {
        const f = row as Record<string, unknown>;
        await tx.firm.create({
          data: { id: String(f.id), userId, name: String(f.name), type: (f.type as FirmType) ?? null, location: String(f.location ?? ""), focus: String(f.focus ?? ""), aum: (f.aum as string) ?? null, recruitingNotes: String(f.recruitingNotes ?? "") },
        });
        n++;
      }
    }
  });
  if (undo.entity === "interactions") {
    const rows = await prisma.interaction.findMany({ where: { id: { in: undo.rows.map((r) => r.id) }, userId }, select: { contactId: true } });
    await recomputeLastInteraction([...new Set(rows.map((r) => r.contactId))]);
  }
  if (undo.entity === "roster") {
    const entries = await prisma.clubRosterEntry.findMany({ where: { id: { in: undo.rows.map((r) => r.id) } }, select: { email: true } });
    await backfillRoster(entries.map((e) => e.email));
  }
  return n;
}

/** lastInteractionDate comes only from real (not deleted, not auto-created) interactions. */
export async function recomputeLastInteraction(contactIds: string[]) {
  for (const contactId of contactIds) {
    const latest = await prisma.interaction.findFirst({
      where: { contactId, deletedAt: null, autoCreated: false },
      orderBy: { date: "desc" },
      select: { date: true },
    });
    await prisma.contact.update({ where: { id: contactId }, data: { lastInteractionDate: latest?.date ?? null } });
  }
}
