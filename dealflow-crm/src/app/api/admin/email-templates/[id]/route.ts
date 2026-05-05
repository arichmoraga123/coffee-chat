import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUserId } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdminUserId();
  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.category !== undefined) data.category = String(body.category).trim();
  if (body.subject !== undefined) data.subject = body.subject ? String(body.subject) : null;
  if (body.body !== undefined) data.body = String(body.body);
  if (body.tags !== undefined) data.tags = Array.isArray(body.tags) ? body.tags : [];
  if (body.isOfficial !== undefined) data.isOfficial = Boolean(body.isOfficial);
  if (body.archived !== undefined) data.archived = Boolean(body.archived);
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "No fields" }, { status: 400 });
  const t = await prisma.emailTemplate.update({ where: { id }, data: data as never });
  return NextResponse.json(t);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdminUserId();
  const { id } = await params;
  await prisma.emailTemplate.update({ where: { id }, data: { archived: true } });
  return NextResponse.json({ ok: true });
}
