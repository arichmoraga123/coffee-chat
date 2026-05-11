import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const clean = code.trim().toUpperCase();
  const referrer = await prisma.user.findUnique({
    where: { referralCode: clean },
    select: { id: true, name: true },
  });
  if (!referrer) return NextResponse.json({ valid: false }, { status: 404 });
  return NextResponse.json({ valid: true, referrerName: referrer.name, referrerId: referrer.id });
}
