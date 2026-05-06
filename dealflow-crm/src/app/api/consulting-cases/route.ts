import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cases = await prisma.consultingCase.findMany({
    where: { isShared: true },
    orderBy: [{ type: "asc" }, { title: "asc" }],
  });
  return NextResponse.json({ cases });
}
