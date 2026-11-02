import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { ensureFitContent, getFitData, getGroupFinderData } from "@/lib/fit-content";
import { computeMaxScores } from "@/lib/groupFinder";

const id = z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and dashes");
const line = z.string().trim().min(1).max(600);
const list = z.array(line).max(30);

const Question = z.object({
  id,
  category: z.string().trim().min(1).max(80),
  prompt: z.string().trim().min(3).max(300),
  whatTheyreTesting: z.string().trim().max(1000),
  framework: list,
  mustInclude: list,
  avoid: list,
  builderFields: z.array(z.object({ key: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_]+$/), label: line, hint: z.string().trim().max(300).optional() })).min(1).max(12),
  outlineTemplate: z.string().trim().max(2000),
  likelyFollowUps: list,
  suggestedStoryThemes: z.array(z.string().trim().min(1).max(60)).max(10),
  targetLengthSeconds: z.string().trim().max(20),
});
const Group = z.object({
  id,
  name: z.string().trim().min(2).max(100),
  type: z.enum(["coverage", "product"]),
  oneLiner: z.string().trim().max(300),
  whatYouDo: z.string().trim().max(1000),
  typicalDeals: list,
  skills: list,
  goodFitIf: list,
  tradeoffs: list,
  relatedLessons: z.array(z.string().trim().regex(/^\d{1,2}\.\d{1,2}$/)).max(12),
  hubs: list,
  whyAngles: list,
  questionsToAskBankers: list,
});
const Finder = z.object({
  questions: z
    .array(
      z.object({
        id: z.string().max(20),
        prompt: z.string().max(300),
        note: z.string().max(300).optional(),
        weight: z.number().min(0).max(3).optional(),
        optional: z.boolean().optional(),
        options: z.array(z.object({ label: z.string().max(200), weights: z.record(z.string(), z.number().min(0).max(3)) })).min(2).max(12),
      }),
    )
    .min(1)
    .max(40),
});

const Body = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("question"), data: Question }),
  z.object({ kind: z.literal("group"), data: Group }),
  z.object({ kind: z.literal("finder"), data: Finder }),
]);

/** Admins edit fit questions, group profiles and the questionnaire weights (stored in FitContent). */
export async function PUT(req: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  await ensureFitContent();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).slice(0, 3).join("; ") }, { status: 400 });
  const b = parsed.data;
  if (b.kind === "finder") {
    const cur = await getGroupFinderData();
    const groupIds = cur.groups.map((g) => g.id);
    const row = await prisma.fitContent.findUnique({ where: { id: "finder" } });
    const data = { ...(row?.data as object), questions: b.data.questions, maxScores: computeMaxScores(b.data.questions, groupIds) };
    await prisma.fitContent.update({ where: { id: "finder" }, data: { data: data as unknown as Prisma.InputJsonValue, updatedBy: auth.userId } });
    return NextResponse.json({ ok: true, maxScores: data.maxScores });
  }
  const key = `${b.kind}:${b.data.id}`;
  if (b.kind === "question") {
    const cats = (await getFitData()).categories;
    if (!cats.includes(b.data.category)) return NextResponse.json({ error: "Unknown category" }, { status: 400 });
  }
  const last = await prisma.fitContent.findFirst({ where: { kind: b.kind }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  await prisma.fitContent.upsert({
    where: { id: key },
    update: { data: b.data as unknown as Prisma.InputJsonValue, updatedBy: auth.userId },
    create: { id: key, kind: b.kind, data: b.data as unknown as Prisma.InputJsonValue, sortOrder: (last?.sortOrder ?? 0) + 1, updatedBy: auth.userId },
  });
  if (b.kind === "group") {
    // A new group needs a maxScores entry (0 until weights are set).
    const row = await prisma.fitContent.findUnique({ where: { id: "finder" } });
    const f = row?.data as { questions: Parameters<typeof computeMaxScores>[0] } | undefined;
    if (f) {
      const groups = (await prisma.fitContent.findMany({ where: { kind: "group" }, select: { id: true } })).map((r) => r.id.replace(/^group:/, ""));
      await prisma.fitContent.update({ where: { id: "finder" }, data: { data: { ...(row!.data as object), maxScores: computeMaxScores(f.questions, groups) } as unknown as Prisma.InputJsonValue } });
    }
  }
  return NextResponse.json({ ok: true });
}

/** DELETE ?id=question:<id> — archives a fit question (kept as a tombstone so the JSON seed doesn't bring it back; answers are kept). */
export async function DELETE(req: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const target = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^question:[a-z0-9-]+$/.test(target)) return NextResponse.json({ error: "Only fit questions can be deleted." }, { status: 400 });
  const row = await prisma.fitContent.findUnique({ where: { id: target } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.fitContent.update({ where: { id: target }, data: { data: { ...(row.data as object), archived: true } as Prisma.InputJsonValue, updatedBy: auth.userId } });
  return NextResponse.json({ ok: true });
}
