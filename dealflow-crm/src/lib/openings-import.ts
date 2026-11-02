import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SheetTab } from "@/lib/sheet-rows";
import { parseOpeningTabs, type ParsedOpening, type RowError, type ValueWarning } from "@/lib/openings-parse";
import { normalizeFirmName, openingKey, trigramSimilarity } from "@/lib/openings";

/** Openings upload (Part B §8.2): plan → preview → commit in one transaction, recorded as an ImportBatch so it can be undone. */

export type OpeningsImportInput = {
  tabs: SheetTab[];
  fileName: string;
  clubId: string | null;
  archiveMissing: boolean;
  /** Firm names from the file the uploader agreed to merge into an existing firm name. */
  mergeFirms: Record<string, string>;
};

type Fields = Omit<ParsedOpening, "row" | "tab">;
const COMPARE: (keyof Fields)[] = ["firmName", "program", "roleType", "track", "group", "classYears", "recruitingSummer", "city", "opensOn", "deadline", "deadlineType", "statusOverride", "link", "source", "notes"];
/** Blank cells in a re-upload don't wipe these (admins may have filled them in). Dates and status always follow the file. */
const KEEP_IF_BLANK = new Set<keyof Fields>(["roleType", "track", "group", "classYears", "link", "source", "notes"]);

export type DiffLine = { field: string; current: string; incoming: string };
export type OpeningsPreview = {
  counts: { new: number; updated: number; unchanged: number; errors: number; archive: number; rows: number };
  newRows: { row: number; firm: string; program: string; city: string }[];
  updatedRows: { id: string; row: number; firm: string; program: string; city: string; diff: DiffLine[] }[];
  unchangedRows: { row: number; firm: string; program: string; city: string }[];
  archiveRows: { id: string; firm: string; program: string; city: string }[];
  errors: RowError[];
  warnings: ValueWarning[];
  firmSuggestions: { from: string; to: string; count: number }[];
  newFirms: string[];
  headerProblems: string[];
};

type Plan = {
  preview: OpeningsPreview;
  creates: (Fields & { id: string; dedupeKey: string })[];
  updates: { id: string; data: Partial<Fields> & { archivedAt: null }; before: Record<string, unknown> }[];
  archiveIds: string[];
};

const show = (v: unknown): string => {
  if (v === null || v === undefined || v === "") return "—";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (Array.isArray(v)) return v.length ? v.join("; ") : "—";
  return String(v);
};
const same = (a: unknown, b: unknown) => {
  const n = (v: unknown) => (v instanceof Date ? v.toISOString().slice(0, 10) : Array.isArray(v) ? v.join("|") : v === "" || v === undefined ? null : v);
  return n(a) === n(b);
};
const isBlank = (v: unknown) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
const newId = () => `c${Date.now().toString(36)}${randomBytes(8).toString("hex")}`;

export async function planOpeningsImport(input: OpeningsImportInput): Promise<Plan> {
  const parsed = parseOpeningTabs(input.tabs);
  const errors = [...parsed.errors];

  // Firm merges the uploader accepted.
  for (const o of parsed.openings) {
    const to = input.mergeFirms[o.firmName];
    if (to) {
      o.firmName = to;
      o.firmNorm = normalizeFirmName(to) || to.toLowerCase();
    }
  }

  const existing = await prisma.opening.findMany({ where: { clubId: input.clubId } });
  const byKey = new Map(existing.map((e) => [e.dedupeKey, e]));
  const knownFirms = new Map<string, string>();
  for (const e of existing) if (!knownFirms.has(e.firmNorm)) knownFirms.set(e.firmNorm, e.firmName);

  // "Did you mean this firm?" for firm names not seen before.
  const suggestions = new Map<string, { from: string; to: string; count: number }>();
  const newFirms = new Set<string>();
  for (const o of parsed.openings) {
    if (knownFirms.has(o.firmNorm)) continue;
    let best: { name: string; score: number } | null = null;
    for (const [, name] of knownFirms) {
      const score = trigramSimilarity(o.firmName, name);
      if (score >= 0.5 && (!best || score > best.score)) best = { name, score };
    }
    if (best) {
      const s = suggestions.get(o.firmName) ?? { from: o.firmName, to: best.name, count: 0 };
      s.count++;
      suggestions.set(o.firmName, s);
    } else newFirms.add(o.firmName);
  }

  const preview: OpeningsPreview = {
    counts: { new: 0, updated: 0, unchanged: 0, errors: 0, archive: 0, rows: parsed.rowsRead },
    newRows: [],
    updatedRows: [],
    unchangedRows: [],
    archiveRows: [],
    errors,
    warnings: parsed.warnings,
    firmSuggestions: [...suggestions.values()],
    newFirms: [...newFirms],
    headerProblems: parsed.headerProblems,
  };
  const plan: Plan = { preview, creates: [], updates: [], archiveIds: [] };
  const seen = new Map<string, number>();

  for (const o of parsed.openings) {
    const { row, tab, ...fields } = o;
    const key = openingKey({ ...fields, clubId: input.clubId });
    const label = { row, firm: o.firmName, program: o.program, city: o.city };
    if (seen.has(key)) {
      errors.push({ tab, row, reason: `Same firm, program, city and summer as row ${seen.get(key)} — kept the first` });
      continue;
    }
    seen.set(key, row);
    const ex = byKey.get(key);
    if (!ex) {
      plan.creates.push({ ...fields, id: newId(), dedupeKey: key });
      preview.newRows.push(label);
      continue;
    }
    const data: Partial<Fields> = {};
    const diff: DiffLine[] = [];
    const before: Record<string, unknown> = { archivedAt: ex.archivedAt };
    for (const f of COMPARE) {
      const incoming = fields[f];
      const current = (ex as unknown as Record<string, unknown>)[f];
      if (KEEP_IF_BLANK.has(f) && isBlank(incoming)) continue;
      if (same(current, incoming)) continue;
      (data as Record<string, unknown>)[f] = incoming;
      before[f] = current;
      diff.push({ field: f, current: show(current), incoming: show(incoming) });
    }
    if (ex.archivedAt) diff.push({ field: "archived", current: "Archived", incoming: "Restored" });
    if (!diff.length) {
      preview.unchangedRows.push(label);
      continue;
    }
    plan.updates.push({ id: ex.id, data: { ...data, archivedAt: null }, before });
    preview.updatedRows.push({ id: ex.id, ...label, diff });
  }

  if (input.archiveMissing) {
    const sources = new Set(parsed.openings.map((o) => o.source).filter(Boolean));
    for (const e of existing) {
      if (e.archivedAt || seen.has(e.dedupeKey)) continue;
      if (sources.size && !sources.has(e.source)) continue;
      plan.archiveIds.push(e.id);
      preview.archiveRows.push({ id: e.id, firm: e.firmName, program: e.program, city: e.city });
    }
  }

  preview.counts = {
    new: plan.creates.length,
    updated: plan.updates.length,
    unchanged: preview.unchangedRows.length,
    errors: errors.length,
    archive: plan.archiveIds.length,
    rows: parsed.rowsRead,
  };
  preview.newRows = preview.newRows.slice(0, 500);
  preview.unchangedRows = preview.unchangedRows.slice(0, 500);
  return plan;
}

export async function commitOpeningsImport(userId: string, input: OpeningsImportInput, plan: Plan) {
  const batchId = newId();
  const now = new Date();
  await prisma.$transaction(
    async (tx) => {
      await tx.importBatch.create({
        data: {
          id: batchId,
          userId,
          source: "openings",
          fileName: input.fileName.slice(0, 200),
          counts: { ...plan.preview.counts },
          undoData: {
            created: plan.creates.map((c) => c.id),
            updated: plan.updates.map((u) => ({ id: u.id, before: u.before })),
            archived: plan.archiveIds,
          } as unknown as Prisma.InputJsonValue,
        },
      });
      if (plan.creates.length) {
        await tx.opening.createMany({
          data: plan.creates.map((c) => ({ ...c, clubId: input.clubId, importBatchId: batchId, createdById: userId })),
        });
      }
      for (const u of plan.updates) await tx.opening.update({ where: { id: u.id }, data: u.data });
      if (plan.archiveIds.length) await tx.opening.updateMany({ where: { id: { in: plan.archiveIds } }, data: { archivedAt: now } });
    },
    { timeout: 120_000, maxWait: 20_000 },
  );
  return { batchId };
}

/** Undo an openings upload: deletes the openings it created, restores the ones it changed, un-archives the ones it archived. */
export async function undoOpeningsImport(batchId: string) {
  const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
  if (!batch || batch.source !== "openings") throw Object.assign(new Error("Not found"), { status: 404 });
  if (batch.status === "undone") throw Object.assign(new Error("Already undone."), { status: 409 });
  const u = (batch.undoData ?? {}) as { created?: string[]; updated?: { id: string; before: Record<string, unknown> }[]; archived?: string[] };
  const dateFields = new Set(["opensOn", "deadline", "archivedAt"]);
  await prisma.$transaction(async (tx) => {
    if (u.created?.length) await tx.opening.deleteMany({ where: { id: { in: u.created } } });
    for (const r of u.updated ?? []) {
      const data = Object.fromEntries(Object.entries(r.before).map(([k, v]) => [k, dateFields.has(k) && typeof v === "string" ? new Date(v) : v]));
      const dedupe = await tx.opening.findUnique({ where: { id: r.id }, select: { id: true } });
      if (dedupe) await tx.opening.update({ where: { id: r.id }, data });
    }
    if (u.archived?.length) await tx.opening.updateMany({ where: { id: { in: u.archived } }, data: { archivedAt: null } });
    await tx.importBatch.update({ where: { id: batchId }, data: { status: "undone" } });
  });
  return { removed: u.created?.length ?? 0, restored: u.updated?.length ?? 0, unarchived: u.archived?.length ?? 0 };
}
