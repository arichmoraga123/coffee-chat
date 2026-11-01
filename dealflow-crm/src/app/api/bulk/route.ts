import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { runBulk, type BulkRequest } from "@/lib/bulk";

/** One endpoint for every bulk edit / bulk action and for single inline edits (a bulk change of one). */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as BulkRequest | null;
  if (!body || !Array.isArray(body.ids) || !body.entity || !body.op) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  try {
    const r = await runBulk({ userId, isAdmin: u?.role === "ADMIN" }, body);
    return NextResponse.json(r);
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    if (status === 500) console.error("bulk failed", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Bulk change failed" }, { status });
  }
}
