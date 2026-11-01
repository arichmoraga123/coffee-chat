import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

/** Mark one notification read ({ id }) or all of them ({}). */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { id?: unknown };
  const where = typeof body.id === "string" ? { id: body.id, userId, readAt: null } : { userId, readAt: null };
  const r = await prisma.notification.updateMany({ where, data: { readAt: new Date() } });
  return NextResponse.json({ count: r.count });
}
