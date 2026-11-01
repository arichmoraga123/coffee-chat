import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserIdFromSession } from "@/lib/auth";
import { startConversation } from "@/lib/dm";

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ to: z.string().min(1) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const r = await startConversation(userId, parsed.data.to);
  if ("error" in r) return NextResponse.json(r, { status: 403 });
  return NextResponse.json(r);
}
