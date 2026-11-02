import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { seedPebQuestions } from "@/lib/mcq/seed-bank";
import { PEB_BANK } from "@/lib/mcq/bank";

export const maxDuration = 300;

/** Admin button: load (upsert) the PE@Broad question bank into the database. Safe to run again. */
export async function POST() {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const n = await seedPebQuestions(prisma, { quiet: true });
  const loaded = await prisma.question.count({ where: { id: { in: PEB_BANK.map((q) => q.id) } } });
  return NextResponse.json({ upserted: n, loaded, total: PEB_BANK.length });
}
