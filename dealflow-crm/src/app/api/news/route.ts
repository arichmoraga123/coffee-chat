import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("category") ?? "All";

  const where =
    tab === "All"
      ? {}
      : { category: tab };

  const articles = await prisma.newsArticle.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    take: 10,
    select: {
      id: true,
      title: true,
      description: true,
      url: true,
      source: true,
      publishedAt: true,
      category: true,
      imageUrl: true,
      cachedAt: true,
    },
  });

  const latest = await prisma.newsArticle.findFirst({
    orderBy: { cachedAt: "desc" },
    select: { cachedAt: true },
  });

  return NextResponse.json({
    articles,
    lastUpdatedAt: latest?.cachedAt?.toISOString() ?? null,
  });
}
