import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GROUP_TARGET_LABEL } from "@/lib/groupFinder";

/** "Add to my targets": adds a Group Finder group to Profile → Targets → Groups. */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = z.object({ groupId: z.string().max(40) }).safeParse(await req.json().catch(() => null));
  const label = parsed.success ? GROUP_TARGET_LABEL[parsed.data.groupId] : undefined;
  if (!label) return NextResponse.json({ error: "Unknown group" }, { status: 400 });
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { recruitingTarget: true } });
  const list = u?.recruitingTarget ?? [];
  if (!list.includes(label)) await prisma.user.update({ where: { id: userId }, data: { recruitingTarget: [...list, label] } });
  return NextResponse.json({ targets: list.includes(label) ? list : [...list, label], added: !list.includes(label), label });
}
