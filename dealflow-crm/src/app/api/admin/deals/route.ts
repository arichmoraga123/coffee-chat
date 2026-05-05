import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUserId } from "@/lib/auth";

/** ADMIN — full deal list for CMS (drafts + published). */
export async function GET() {
  await requireAdminUserId();
  const deals = await prisma.deal.findMany({
    orderBy: { announcedAt: "desc" },
    take: 1000,
  });
  return NextResponse.json({ deals });
}
