import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { normalizeIntArray } from "@/lib/form-arrays";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;

  const existing = await prisma.interaction.findFirst({
    where: { id, userId },
    select: { id: true, actionItems: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if ("actionItemsChecked" in body) {
    const checked = normalizeIntArray(body.actionItemsChecked);
    const maxIdx = existing.actionItems.length - 1;
    const filtered = checked.filter((i) => i >= 0 && i <= maxIdx);
    const updated = await prisma.interaction.update({
      where: { id },
      data: { actionItemsChecked: filtered },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Only actionItemsChecked updates are supported." }, { status: 400 });
}
