import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserIdFromSession } from "@/lib/auth";
import { createChallenge } from "@/lib/challenges";

const Body = z.object({
  to: z.string().min(1),
  mode: z.enum(["async", "live"]).default("async"),
  length: z.union([z.literal(5), z.literal(10)]).default(5),
  topic: z
    .object({
      modules: z.array(z.number().int().min(0).max(20)).max(12).optional(),
      lessons: z.array(z.string().regex(/^\d{1,2}-\d{1,2}$/)).max(20).optional(),
      categories: z.array(z.string().max(80)).max(10).optional(),
      difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
    })
    .default({}),
  conversationId: z.string().optional(),
});

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const r = await createChallenge({ creatorId: userId, opponentId: parsed.data.to, ...parsed.data });
  if ("error" in r) return NextResponse.json(r, { status: 400 });
  return NextResponse.json(r, { status: 201 });
}
