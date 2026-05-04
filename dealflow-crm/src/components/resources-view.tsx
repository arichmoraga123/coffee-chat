"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ResourceItem } from "@/lib/resources";
import { RESOURCE_SECTIONS } from "@/lib/resources";
import { Bookmark } from "lucide-react";

export function ResourcesView({ initialBookmarkSlugs }: { initialBookmarkSlugs: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
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

  const sections = useMemo(() => {
    const n = q.trim().toLowerCase();
    const m = (item: ResourceItem) => {
      if (!n) return true;
      return (
        item.title.toLowerCase().includes(n) ||
        item.description.toLowerCase().includes(n) ||
        item.category.toLowerCase().includes(n)
      );
    };
    return RESOURCE_SECTIONS.map((section) => ({
      title: section.title,
      items: section.items.filter(m),
    })).filter((s) => s.items.length > 0);
  }, [q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Resources</h1>
        <p className="mt-1 text-sm text-zinc-400">Curated links for IB/PE recruiting prep.</p>
      </div>
      <Input placeholder="Search resources…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />

      {sections.map((section) => (
        <div key={section.title}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">{section.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {section.items.map((item) => (
              <Card key={item.slug} className="relative flex flex-col p-4">
                <button
                  type="button"
                  className="absolute right-3 top-3 rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-amber-300"
                  aria-label={bookmarked.has(item.slug) ? "Remove bookmark" : "Bookmark"}
                  onClick={() => void toggleBookmark(item.slug)}
                >
                  <Bookmark className={bookmarked.has(item.slug) ? "fill-amber-400 text-amber-400" : ""} size={20} />
                </button>
                <span className="mb-2 w-fit rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">{item.category}</span>
                <h3 className="pr-8 text-base font-semibold text-zinc-100">{item.title}</h3>
                <p className="mt-1 flex-1 text-sm text-zinc-400">{item.description}</p>
                <a
                  className="mt-3 inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline"
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
        </div>
      ))}
    </div>
  );
}
