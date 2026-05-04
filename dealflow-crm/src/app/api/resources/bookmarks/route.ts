import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { allResources } from "@/lib/resources";

const slugs = new Set(allResources().map((r) => r.slug));

export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.resourceBookmark.findMany({
    where: { userId },
    select: { resourceSlug: true },
  });
  return NextResponse.json({ slugs: rows.map((r) => r.resourceSlug) });
}

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const slug = String(body.slug ?? "");
  if (!slugs.has(slug)) return NextResponse.json({ error: "Invalid resource" }, { status: 400 });

  const existing = await prisma.resourceBookmark.findUnique({
    where: { userId_resourceSlug: { userId, resourceSlug: slug } },
  });

  if (existing) {
    await prisma.resourceBookmark.delete({ where: { id: existing.id } });
    return NextResponse.json({ bookmarked: false, slug });
  }

  await prisma.resourceBookmark.create({ data: { userId, resourceSlug: slug } });
  return NextResponse.json({ bookmarked: true, slug });
}
