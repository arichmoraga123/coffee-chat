import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUserId } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdminUserId();
  const { id } = await params;
  const body = (await req.json()) as { status?: string };
  const status = body.status;
  if (!status || !["pending", "reviewed", "dismissed"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const r = await prisma.contentReport.update({ where: { id }, data: { status } });
  return NextResponse.json(r);
}
