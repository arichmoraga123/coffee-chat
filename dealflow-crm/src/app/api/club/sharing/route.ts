import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

const Body = z.object({
  shareLearning: z.boolean().optional(),
  shareDrill: z.boolean().optional(),
  shareTargets: z.boolean().optional(),
  shareFirms: z.boolean().optional(),
  classYear: z.number().int().min(2020).max(2040).nullable().optional(),
});

export async function PATCH(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  await prisma.user.update({ where: { id: userId }, data: parsed.data });
  return NextResponse.json({ ok: true });
}
