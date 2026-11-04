import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserIdFromSession } from "@/lib/auth";
import { createDuel } from "@/lib/group-competition";

const Body = z.object({ challengerId: z.string().max(64), opponentId: z.string().max(64), days: z.number().int() });

/** A captain challenges another group to a points duel. */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid duel" }, { status: 400 });
  const r = await createDuel(userId, parsed.data.challengerId, parsed.data.opponentId, parsed.data.days);
  return "error" in r ? NextResponse.json(r, { status: 400 }) : NextResponse.json(r, { status: 201 });
}
