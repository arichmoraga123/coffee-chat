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
        {ago ? <p className="text-[10px] text-[#888888]">Updated {ago}</p> : null}
      </div>
      <div className="mb-3 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <Button
            key={t}
            type="button"
            size="sm"
            variant={tab === t ? "default" : "ghost"}
            className={cn(
              "h-7 px-2 text-xs",
              tab === t &&
                "border-[#3a3a3a] bg-[#1a1a1a] text-[#f5f5f5] hover:bg-[#1a1a1a]",
            )}
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
              className="group flex gap-2 rounded-lg border border-[#2a2a2a] bg-[#141414] p-2 transition-all duration-200 hover:border-[#3a3a3a] hover:bg-[#1a1a1a]"
            >
              {a.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.imageUrl} alt="" className="size-14 shrink-0 rounded-lg object-cover ring-1 ring-[#2a2a2a]" />
              ) : (
                <div className="size-14 shrink-0 rounded-lg bg-[#1a1a1a] ring-1 ring-[#2a2a2a]" />
              )}
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="rounded border border-[#2a2a2a] bg-[#161616] px-1.5 py-0.5 text-[10px] text-[#888888]">
                    {a.category}
                  </span>
                  <span className="text-[10px] text-[#888888]">{a.source}</span>
                  <span className="text-[10px] text-[#555555]">
                    {formatDistanceToNow(new Date(a.publishedAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs font-medium leading-snug text-[#f0f0f0] group-hover:underline group-hover:decoration-[#f5f5f5]/40">
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
