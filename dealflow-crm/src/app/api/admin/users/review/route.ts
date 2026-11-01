import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("keep"), ids: z.array(z.string()).min(1).max(500) }),
  z.object({ action: z.literal("delete"), ids: z.array(z.string()).min(1).max(500) }),
  z.object({ action: z.literal("restore"), ids: z.array(z.string()).min(1).max(500) }),
  z.object({ action: z.literal("purge"), confirm: z.literal("PURGE") }),
]);

/**
 * keep → never flag again. delete → soft delete (hidden + can't sign in). restore → undo.
 * purge → permanently removes accounts soft-deleted more than 30 days ago. Nothing here runs automatically.
 */
export async function POST(req: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const b = parsed.data;
  const notAdmin = { role: { notIn: ["ADMIN", "MENTOR"] } };

  if (b.action === "keep") {
    const r = await prisma.user.updateMany({ where: { id: { in: b.ids } }, data: { reviewedKeep: true } });
    return NextResponse.json({ updated: r.count });
  }
  if (b.action === "delete") {
    const r = await prisma.user.updateMany({
      where: { id: { in: b.ids }, ...notAdmin },
      data: { deletedAt: new Date(), accountActive: false },
    });
    await prisma.clubMember.updateMany({ where: { userId: { in: b.ids } }, data: { active: false } });
    return NextResponse.json({ updated: r.count });
  }
  if (b.action === "restore") {
    const r = await prisma.user.updateMany({ where: { id: { in: b.ids } }, data: { deletedAt: null, accountActive: true } });
    return NextResponse.json({ updated: r.count });
  }
  const cutoff = new Date(Date.now() - 30 * 86_400_000);
  const r = await prisma.user.deleteMany({ where: { deletedAt: { lt: cutoff }, ...notAdmin } });
  return NextResponse.json({ purged: r.count });
}
