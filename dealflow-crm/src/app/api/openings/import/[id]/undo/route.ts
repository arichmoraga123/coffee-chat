import { NextResponse } from "next/server";
import { getUserIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { undoOpeningsImport } from "@/lib/openings-import";
import { openingsAccess } from "@/lib/openings-data";

/** Undo an openings upload (the uploader, or any admin). */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const batch = await prisma.importBatch.findUnique({ where: { id }, select: { userId: true, source: true } });
  const access = await openingsAccess(userId);
  if (!batch || batch.source !== "openings" || (batch.userId !== userId && !access.isAdmin)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    return NextResponse.json(await undoOpeningsImport(id));
  } catch (e) {
    const status = (e as { status?: number }).status ?? 500;
    return NextResponse.json({ error: (e as Error).message }, { status });
  }
}
