import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserIdFromSession } from "@/lib/auth";
import { respondDuel } from "@/lib/group-competition";

const Body = z.object({ action: z.enum(["accept", "decline", "cancel"]) });

/** Accept or decline a challenge (challenged captain), or cancel it (challenging captain). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  const r = await respondDuel(userId, id, parsed.data.action);
  return "error" in r ? NextResponse.json(r, { status: 400 }) : NextResponse.json(r);
}
