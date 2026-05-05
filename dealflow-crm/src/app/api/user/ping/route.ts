import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

const THROTTLE_MS = 5 * 60 * 1000;

/** Updates lastActiveAt (throttled) for analytics. */
export async function POST() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastActiveAt: true },
  });
  const now = Date.now();
  const last = u?.lastActiveAt?.getTime() ?? 0;
  if (now - last < THROTTLE_MS) {
    return NextResponse.json({ ok: true, skipped: true });
  }
  await prisma.user.update({
    where: { id: userId },
    data: { lastActiveAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
