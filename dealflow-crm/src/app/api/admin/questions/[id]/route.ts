import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import { questionDedupeKey } from "@/lib/question-dedupe";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  const existing = await prisma.question.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.question === "string") data.question = body.question.trim();
  if (typeof body.answer === "string") data.answer = body.answer.trim();
  if (typeof body.category === "string") data.category = body.category.trim();
  if (typeof body.subcategory === "string" || body.subcategory === null) {
    data.subcategory = body.subcategory;
  }
  if (typeof body.difficulty === "string") data.difficulty = body.difficulty;
  if (Array.isArray(body.tags)) data.tags = body.tags.map((t: unknown) => String(t));
  if (typeof body.source === "string" || body.source === null) data.source = body.source;
  if (typeof body.status === "string") data.status = body.status;

  if (typeof data.question === "string") {
    data.dedupeKey = questionDedupeKey(data.question as string);
  }

  if (body.status === "active" && existing.status === "pending") {
    const nextQ = (data.question as string) ?? existing.question;
    const clash = await prisma.question.findFirst({
      where: {
        dedupeKey: questionDedupeKey(nextQ),
        id: { not: id },
        status: "active",
      },
    });
    if (clash) {
      return NextResponse.json(
        { error: "Duplicate active question text" },
        { status: 409 },
      );
    }
    data.dedupeKey = questionDedupeKey(nextQ);
  }

  const row = await prisma.question.update({
    where: { id },
    data,
  });
  return NextResponse.json(row);
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;

  await prisma.question.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
