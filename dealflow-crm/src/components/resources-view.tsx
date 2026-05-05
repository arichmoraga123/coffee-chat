"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ResourceItem } from "@/lib/resources";
import { allResources, resourceTabs } from "@/lib/resources";
import { Bookmark, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmailTemplatesTab } from "@/components/email-templates-tab";

export function ResourcesView({ initialBookmarkSlugs }: { initialBookmarkSlugs: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [mainTab, setMainTab] = useState<"links" | "templates">("links");
  const [tab, setTab] = useState<string>("All");
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set(initialBookmarkSlugs));

  useEffect(() => {
    setBookmarked(new Set(initialBookmarkSlugs));
  }, [initialBookmarkSlugs]);

  const toggleBookmark = async (slug: string) => {
    const res = await fetch("/api/resources/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { bookmarked: boolean };
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (data.bookmarked) next.add(slug);
      else next.delete(slug);
      return next;
    });
    router.refresh();
  };

  const items = useMemo(() => {
    const n = q.trim().toLowerCase();
    return allResources().filter((item: ResourceItem) => {
      if (tab !== "All" && item.category !== tab) return false;
      if (!n) return true;
      return (
        item.title.toLowerCase().includes(n) ||
        item.description.toLowerCase().includes(n) ||
        item.category.toLowerCase().includes(n)
      );
    });
  }, [q, tab]);

  const tabs = resourceTabs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Resources</h1>
        <p className="mt-1 text-sm text-zinc-400">Curated links for IB/PE recruiting prep.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-2">
        <Button
          type="button"
          size="sm"
          variant={mainTab === "links" ? "default" : "outline"}
          onClick={() => setMainTab("links")}
        >
          Links
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mainTab === "templates" ? "default" : "outline"}
          onClick={() => setMainTab("templates")}
        >
          Email templates
        </Button>
      </div>

      {mainTab === "templates" ? (
        <EmailTemplatesTab />
      ) : null}

      {mainTab === "links" ? (
        <>
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t}
            type="button"
            size="sm"
            variant={tab === t ? "default" : "outline"}
            onClick={() => setTab(t)}
          >
            {t}
          </Button>
        ))}
      </div>

      <Input placeholder="Search resources…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card key={item.slug} className="relative flex flex-col border-zinc-800 bg-zinc-900/60 p-4">
            <button
              type="button"
              className="absolute right-3 top-3 rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-amber-300"
              aria-label={bookmarked.has(item.slug) ? "Remove bookmark" : "Bookmark"}
              onClick={() => void toggleBookmark(item.slug)}
            >
              <Bookmark className={bookmarked.has(item.slug) ? "fill-amber-400 text-amber-400" : ""} size={20} />
            </button>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="w-fit rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">{item.category}</span>
              {item.isPrimary ? (
                <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">
                  <Star className="size-3 fill-amber-400 text-amber-400" />
                  Essential
                </span>
              ) : null}
            </div>
            <h3 className="pr-8 text-base font-semibold text-zinc-100">{item.title}</h3>
            <p className="mt-1 flex-1 text-sm text-zinc-400">{item.description}</p>
            <a
              className="mt-3 inline-flex items-center gap-1 text-sm text-[#f0f0f0] underline-offset-4 hover:underline"
              href={item.url === "#" ? undefined : item.url}
              target={item.url === "#" ? undefined : "_blank"}
              rel={item.url === "#" ? undefined : "noopener noreferrer"}
              onClick={(e) => {
                if (item.url === "#") e.preventDefault();
              }}
            >
              Open →
            </a>
          </Card>
        ))}
      </div>
        </>
      ) : null}
    </div>
  );
}
