import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

const Body = z.object({ sidebarCollapsed: z.boolean() });

/** Saves small UI choices (currently: sidebar collapsed) to the user's settings. */
export async function PATCH(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  await prisma.user.update({ where: { id: userId }, data: { sidebarCollapsed: parsed.data.sidebarCollapsed } });
  return NextResponse.json({ ok: true });
}
