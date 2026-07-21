import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as { inOutreachQueue?: boolean; queueExcluded?: boolean };
  const data: { inOutreachQueue?: boolean; queueExcluded?: boolean } = {};
  if (typeof body.inOutreachQueue === "boolean") data.inOutreachQueue = body.inOutreachQueue;
  if (typeof body.queueExcluded === "boolean") data.queueExcluded = body.queueExcluded;
  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "inOutreachQueue or queueExcluded required" }, { status: 400 });
  }

  const contact = await prisma.contact.findFirst({ where: { id, userId } });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.contact.update({
    where: { id },
    data,
  });
  return NextResponse.json(updated);
}
