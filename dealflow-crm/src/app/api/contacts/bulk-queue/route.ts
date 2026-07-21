import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { contactIds?: string[]; add?: boolean };
  const contactIds = Array.isArray(body.contactIds) ? body.contactIds : [];
  const add = body.add !== false;

  if (!contactIds.length) {
    return NextResponse.json({ error: "contactIds required" }, { status: 400 });
  }

  const result = await prisma.contact.updateMany({
    where: { userId, id: { in: contactIds } },
    data: { inOutreachQueue: add },
  });

  return NextResponse.json({ updated: result.count });
}
