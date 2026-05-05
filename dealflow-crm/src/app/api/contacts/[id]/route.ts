import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { buildContactPatchData } from "@/lib/contact-body";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  const existing = await prisma.contact.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = buildContactPatchData(body);
  if (typeof body.firmId === "string" && body.firmId) {
    const firm = await prisma.firm.findFirst({
      where: { id: body.firmId, userId },
      select: { id: true },
    });
    if (!firm) return NextResponse.json({ error: "Invalid firm." }, { status: 400 });
  }

  const keys = Object.keys(data);
  if (keys.length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const contact = await prisma.contact.update({
    where: { id },
    data,
    include: { firm: true },
  });
  return NextResponse.json(contact);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.contact.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
