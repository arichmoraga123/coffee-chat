import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCronSecret } from "@/lib/cron-auth";

export async function GET(req: Request) {
  const denied = requireCronSecret(req);
  if (denied) return denied;

  await prisma.$transaction([
    prisma.user.updateMany({ data: { weeklyXP: 0 } }),
    prisma.leaderboardEntry.updateMany({ data: { weeklyXP: 0 } }),
  ]);

  return NextResponse.json({ ok: true });
}
