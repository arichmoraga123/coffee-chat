"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Article = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  source: string;
  publishedAt: string;
  category: string;
  imageUrl: string | null;
};

const TABS = ["All", "M&A", "PE/VC", "Markets", "Banking"] as const;

export function DashboardNewsFeed() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [articles, setArticles] = useState<Article[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const cat = tab === "All" ? "All" : tab;
    const res = await fetch(`/api/news?category=${encodeURIComponent(cat)}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { articles: Article[]; lastUpdatedAt: string | null };
    setArticles(data.articles ?? []);
    setLastUpdatedAt(data.lastUpdatedAt ?? null);
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const ago =
    lastUpdatedAt != null
      ? formatDistanceToNow(new Date(lastUpdatedAt), { addSuffix: true })
      : null;

  return (
    <Card className="border-zinc-800 bg-zinc-900/60 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Live news</p>
        {ago ? <p className="text-[10px] text-zinc-500">Updated {ago}</p> : null}
      </div>
      <div className="mb-3 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <Button
            key={t}
            type="button"
            size="sm"
            variant={tab === t ? "default" : "ghost"}
            className={cn("h-7 px-2 text-xs", tab === t && "bg-cyan-600 text-white hover:bg-cyan-500")}
            onClick={() => setTab(t)}
          >
            {t}
          </Button>
        ))}
      </div>
      {loading ? (
        <p className="text-xs text-zinc-500">Loading headlines…</p>
      ) : articles.length === 0 ? (
        <p className="text-xs text-zinc-500">
          No cached articles yet. Configure <code className="text-cyan-600">NEWS_API_KEY</code> and run the refresh
          cron.
        </p>
      ) : (
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {articles.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex gap-2 rounded border border-zinc-800/80 bg-black/30 p-2 hover:border-zinc-600"
            >
              {a.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.imageUrl} alt="" className="size-14 shrink-0 rounded object-cover" />
              ) : (
                <div className="size-14 shrink-0 rounded bg-zinc-800" />
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">{a.category}</span>
                  <span className="text-[10px] text-zinc-500">{a.source}</span>
                  <span className="text-[10px] text-zinc-600">
                    {formatDistanceToNow(new Date(a.publishedAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs font-medium leading-snug text-zinc-100">{a.title}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
