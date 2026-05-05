"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Newspaper } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

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
    <Card className="p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="section-label">Live news</p>
        {ago ? <p className="text-[10px] text-zinc-500">Updated {ago}</p> : null}
      </div>
      <div className="mb-3 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <Button
            key={t}
            type="button"
            size="sm"
            variant={tab === t ? "default" : "ghost"}
            className={cn("h-7 px-2 text-xs", tab === t && "bg-gradient-to-b from-cyan-400 to-cyan-600 text-zinc-950 shadow-[0_0_16px_-4px_rgba(0,188,212,0.45)] hover:from-cyan-300 hover:to-cyan-500")}
            onClick={() => setTab(t)}
          >
            {t}
          </Button>
        ))}
      </div>
      {loading ? (
        <div className="space-y-3 py-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-2">
              <Skeleton className="size-14 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                <Skeleton className="h-2 w-24" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="No headlines yet"
          description="Configure NEWS_API_KEY and run the refresh-news cron to populate stories."
        />
      ) : (
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {articles.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex gap-2 rounded-xl border border-white/10 bg-black/25 p-2 transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-400/35 hover:bg-cyan-950/20 hover:shadow-[0_0_24px_-8px_rgba(0,188,212,0.35)]"
            >
              {a.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.imageUrl} alt="" className="size-14 shrink-0 rounded-lg object-cover ring-1 ring-white/10" />
              ) : (
                <div className="size-14 shrink-0 rounded-lg bg-zinc-800/90 ring-1 ring-white/10" />
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-zinc-300 ring-1 ring-white/10">
                    {a.category}
                  </span>
                  <span className="text-[10px] text-zinc-500">{a.source}</span>
                  <span className="text-[10px] text-zinc-600">
                    {formatDistanceToNow(new Date(a.publishedAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs font-medium leading-snug text-zinc-100 group-hover:text-white">
                  {a.title}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </Card>
  );
}
