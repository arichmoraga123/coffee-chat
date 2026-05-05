import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

/** SHARED wiki — all logged-in users. */
export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const firms = await prisma.firmResearch.findMany({ orderBy: { firmName: "asc" } });
  return NextResponse.json({ firms });
}
