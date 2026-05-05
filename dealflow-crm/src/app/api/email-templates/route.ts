import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

/** SHARED library. */
export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const where: Record<string, unknown> = { archived: false };
  if (category && category !== "All") where.category = category;
  const templates = await prisma.emailTemplate.findMany({
    where: where as never,
    orderBy: [{ isOfficial: "desc" }, { upvotes: "desc" }, { createdAt: "desc" }],
  });
  const upvotes = await prisma.templateUpvote.findMany({
    where: { userId },
    select: { templateId: true },
  });
  const upvoted = new Set(upvotes.map((u) => u.templateId));
  return NextResponse.json({ templates, upvoted: [...upvoted] });
}

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  const category = String(body.category ?? "").trim();
  const bodyText = String(body.body ?? "").trim();
  const subject = body.subject ? String(body.subject).trim() : null;
  const tags = Array.isArray(body.tags) ? (body.tags as string[]) : [];
  if (!title || !category || !bodyText) {
    return NextResponse.json({ error: "title, category, body required" }, { status: 400 });
  }
  const dedupeKey = createHash("sha256").update(`tpl|${title}|${category}`).digest("hex");
  const t = await prisma.emailTemplate.create({
    data: {
      title,
      category,
      subject,
      body: bodyText,
      tags,
      submittedById: userId,
      dedupeKey,
      isOfficial: false,
    },
  });
  return NextResponse.json(t);
}
