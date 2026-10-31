import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { buildNewsDealRow, matchesDealKeywords } from "@/lib/deal-from-news";

const CATEGORY_QUERIES: { category: string; q: string }[] = [
  { category: "M&A", q: '(acquire OR acquisition OR "take private" OR buyout OR merger) AND (billion OR million)' },
  { category: "M&A", q: "mergers acquisitions deal" },
  { category: "PE/VC", q: "private equity venture capital" },
  { category: "Markets", q: "S&P 500 federal reserve interest rates" },
  { category: "Banking", q: "investment banking Goldman Morgan Stanley" },
];

type NewsApiArticle = {
  title: string | null;
  description: string | null;
  url: string | null;
  source?: { name?: string | null };
  publishedAt: string | null;
  urlToImage?: string | null;
};

type NewsApiResponse = {
  status: string;
  articles?: NewsApiArticle[];
};

export async function refreshNewsFromApi(): Promise<{
  inserted: number;
  dealsInserted: number;
  error?: string;
}> {
  const key = env.newsApiKey;
  if (!key) {
    return { inserted: 0, dealsInserted: 0, error: "NEWS_API_KEY missing" };
  }

  let inserted = 0;
  const errors: string[] = [];
  const dealCandidates: { title: string; description: string | null; url: string; announcedAt: Date }[] = [];

  for (const { category, q } of CATEGORY_QUERIES) {
    const url = new URL("https://newsapi.org/v2/everything");
    url.searchParams.set("q", q);
    url.searchParams.set("language", "en");
    url.searchParams.set("sortBy", "publishedAt");
    url.searchParams.set("pageSize", "15");
    url.searchParams.set("apiKey", key);

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text();
      errors.push(`NewsAPI error ${res.status} for "${q}": ${text.slice(0, 200)}`);
      continue;
    }
    const data = (await res.json()) as NewsApiResponse;
    if (data.status !== "ok" || !data.articles?.length) continue;

    for (const a of data.articles) {
      if (!a.title || !a.url) continue;
      const publishedAt = a.publishedAt ? new Date(a.publishedAt) : new Date();
      await prisma.newsArticle.upsert({
        where: { url: a.url },
        create: {
          title: a.title.slice(0, 500),
          description: a.description?.slice(0, 2000) ?? null,
          url: a.url,
          source: a.source?.name?.slice(0, 200) ?? "News",
          publishedAt,
          category,
          imageUrl: a.urlToImage?.slice(0, 2000) ?? null,
        },
        update: {
          title: a.title.slice(0, 500),
          description: a.description?.slice(0, 2000) ?? null,
          source: a.source?.name?.slice(0, 200) ?? "News",
          publishedAt,
          category,
          imageUrl: a.urlToImage?.slice(0, 2000) ?? null,
          cachedAt: new Date(),
        },
      });
      inserted += 1;

      if (
        (category === "M&A" || category === "PE/VC") &&
        matchesDealKeywords(a.title, a.description) &&
        !dealCandidates.some((c) => c.url === a.url)
      ) {
        dealCandidates.push({ title: a.title, description: a.description, url: a.url, announcedAt: publishedAt });
      }
    }
  }

  // Skip articles we've already turned into deals, then classify the rest in parallel (5 at a time).
  const known = await prisma.deal.findMany({
    where: { sourceUrl: { in: dealCandidates.map((c) => c.url) } },
    select: { sourceUrl: true },
  });
  const knownUrls = new Set(known.map((k) => k.sourceUrl));
  const fresh = dealCandidates.filter((c) => !knownUrls.has(c.url)).slice(0, 40);
  const dealRows: Prisma.DealCreateManyInput[] = [];
  for (let i = 0; i < fresh.length; i += 5) {
    const built = await Promise.all(fresh.slice(i, i + 5).map((c) => buildNewsDealRow(c).catch(() => null)));
    for (const row of built) {
      if (row && !dealRows.some((r) => r.dedupeKey === row.dedupeKey)) dealRows.push(row);
    }
  }

  let dealsInserted = 0;
  if (dealRows.length > 0) {
    const created = await prisma.deal.createMany({
      data: dealRows,
      skipDuplicates: true,
    });
    dealsInserted = created.count;
  }

  return { inserted, dealsInserted, ...(errors.length ? { error: errors.join(" | ") } : {}) };
}
