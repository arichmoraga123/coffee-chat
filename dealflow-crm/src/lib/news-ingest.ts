import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

const CATEGORY_QUERIES: { category: string; q: string }[] = [
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

export async function refreshNewsFromApi(): Promise<{ inserted: number; error?: string }> {
  const key = env.newsApiKey;
  if (!key) {
    return { inserted: 0, error: "NEWS_API_KEY missing" };
  }

  let inserted = 0;
  for (const { category, q } of CATEGORY_QUERIES) {
    const url = new URL("https://newsapi.org/v2/everything");
    url.searchParams.set("q", q);
    url.searchParams.set("language", "en");
    url.searchParams.set("sortBy", "publishedAt");
    url.searchParams.set("pageSize", "15");
    url.searchParams.set("apiKey", key);

    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) {
      const text = await res.text();
      return { inserted, error: `NewsAPI error ${res.status}: ${text.slice(0, 200)}` };
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
    }
  }

  return { inserted };
}
