import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { runUndo, type Undo } from "@/lib/bulk";

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const undo = (await req.json().catch(() => null)) as Undo | null;
  if (!undo || !undo.entity || !Array.isArray(undo.rows)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  try {
    const n = await runUndo({ userId, isAdmin: u?.role === "ADMIN" }, undo);
    return NextResponse.json({ restored: n });
  } catch (e) {
    console.error("undo failed", e);
    return NextResponse.json({ error: "Couldn't undo that." }, { status: 500 });
  }
}
