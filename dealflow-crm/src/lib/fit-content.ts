import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { FIT_DATA, type FitData, type FitQuestion } from "@/lib/fit";
import { GROUP_FINDER, type GroupFinderData, type GroupProfile, type FinderQuestion } from "@/lib/groupFinder";

/**
 * Fit questions and Group Finder content live in the FitContent table so admins can edit them (F4).
 * The JSON files seed it: any id missing from the table is added; existing rows (admin edits) are never overwritten.
 */
let seeded: Promise<void> | null = null;

async function seedMissing() {
  const have = new Set((await prisma.fitContent.findMany({ select: { id: true } })).map((r) => r.id));
  const rows: Prisma.FitContentCreateManyInput[] = [];
  FIT_DATA.questions.forEach((q, i) => {
    if (!have.has(`question:${q.id}`)) rows.push({ id: `question:${q.id}`, kind: "question", data: q as unknown as Prisma.InputJsonValue, sortOrder: i });
  });
  GROUP_FINDER.groups.forEach((g, i) => {
    if (!have.has(`group:${g.id}`)) rows.push({ id: `group:${g.id}`, kind: "group", data: g as unknown as Prisma.InputJsonValue, sortOrder: i });
  });
  if (!have.has("finder")) {
    rows.push({
      id: "finder",
      kind: "finder",
      data: { questions: GROUP_FINDER.questions, maxScores: GROUP_FINDER.maxScores, scoring: GROUP_FINDER.scoring, disclaimer: GROUP_FINDER.disclaimer, categories: FIT_DATA.categories } as unknown as Prisma.InputJsonValue,
    });
  }
  if (rows.length) await prisma.fitContent.createMany({ data: rows, skipDuplicates: true });
}

export async function ensureFitContent() {
  seeded ??= seedMissing().catch((e) => {
    seeded = null;
    throw e;
  });
  return seeded;
}

type FinderRow = { questions: FinderQuestion[]; maxScores: Record<string, number>; scoring: string; disclaimer: string; categories?: string[] };

export async function getFitData(): Promise<FitData> {
  await ensureFitContent();
  const [rows, finder] = await Promise.all([
    prisma.fitContent.findMany({ where: { kind: "question" }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.fitContent.findUnique({ where: { id: "finder" } }),
  ]);
  const categories = ((finder?.data as FinderRow | undefined)?.categories ?? FIT_DATA.categories).slice();
  return {
    version: FIT_DATA.version,
    categories,
    questions: rows.filter((r) => !(r.data as { archived?: boolean }).archived).map((r) => r.data as unknown as FitQuestion),
  };
}

export async function getGroupFinderData(): Promise<GroupFinderData> {
  await ensureFitContent();
  const [groups, finder] = await Promise.all([
    prisma.fitContent.findMany({ where: { kind: "group" }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
    prisma.fitContent.findUnique({ where: { id: "finder" } }),
  ]);
  const f = (finder?.data as FinderRow | undefined) ?? GROUP_FINDER;
  return {
    version: GROUP_FINDER.version,
    groups: groups.map((g) => g.data as unknown as GroupProfile),
    questions: f.questions,
    maxScores: f.maxScores,
    scoring: f.scoring,
    disclaimer: f.disclaimer,
  };
}
