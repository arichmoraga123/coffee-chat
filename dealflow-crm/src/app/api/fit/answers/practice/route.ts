import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const Body = z.object({ questionId: z.string().min(1).max(80), variant: z.string().max(200).default(""), rating: z.enum(["nailed", "needs_work"]) });

/** "I nailed it" / "Needs work" after practicing out loud. */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { questionId, variant, rating } = parsed.data;
  const data = { status: "practiced", selfRating: rating, practicedAt: new Date() };
  await prisma.fitAnswer.upsert({
    where: { userId_questionId_variant: { userId, questionId, variant: variant.trim() } },
    update: data,
    create: { userId, questionId, variant: variant.trim(), ...data },
  });
  return NextResponse.json({ ok: true });
}
