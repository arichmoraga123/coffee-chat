import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as { targetType?: string; targetId?: string; reason?: string };
  const targetType = String(body.targetType ?? "").trim();
  const targetId = String(body.targetId ?? "").trim();
  const reason = String(body.reason ?? "").trim();
  if (!targetType || !targetId || !reason) {
    return NextResponse.json({ error: "targetType, targetId, reason required" }, { status: 400 });
  }
  const r = await prisma.contentReport.create({
    data: { reporterId: userId, targetType, targetId, reason },
  });
  return NextResponse.json(r);
}
