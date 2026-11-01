import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { STORY_SLOTS } from "@/lib/storybank";

const SLOT_IDS = new Set([...STORY_SLOTS.map((s) => s.id), "custom"]);
const Body = z.object({ slot: z.string().refine((v) => SLOT_IDS.has(v)), rawText: z.string().max(12000).default(""), title: z.string().max(120).optional() });

export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const stories = await prisma.story.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ stories });
}

/** Creates a story draft (one per built-in slot; any number of custom ones). */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { slot, rawText, title } = parsed.data;
  if (slot !== "custom") {
    const existing = await prisma.story.findFirst({ where: { userId, slot } });
    if (existing) {
      const s = await prisma.story.update({ where: { id: existing.id }, data: { rawText, ...(title !== undefined ? { title } : {}) } });
      return NextResponse.json({ story: s });
    }
  }
  const count = await prisma.story.count({ where: { userId } });
  if (count >= 20) return NextResponse.json({ error: "That's plenty of stories. Edit an existing one instead." }, { status: 400 });
  const story = await prisma.story.create({ data: { userId, slot, rawText, title: title ?? "" } });
  return NextResponse.json({ story }, { status: 201 });
}
