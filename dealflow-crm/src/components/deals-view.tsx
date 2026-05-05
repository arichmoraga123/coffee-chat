"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Deal = {
  id: string;
  title: string;
  acquirer: string | null;
  target: string | null;
  dealValue: string | null;
  dealType: string;
  sector: string | null;
  summary: string;
  keyThesis: string | null;
  risks: string | null;
  sourceUrl: string | null;
  announcedAt: string;
};

export function DealsView() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [bookmarks, setBookmarks] = useState<Record<string, string | null | undefined>>({});
  const [filters, setFilters] = useState({ dealType: "", sector: "", size: "" });
  const [practice, setPractice] = useState<string | null>(null);

  const load = async () => {
    const p = new URLSearchParams();
    if (filters.dealType) p.set("dealType", filters.dealType);
    if (filters.sector) p.set("sector", filters.sector);
    if (filters.size) p.set("size", filters.size);
    const res = await fetch(`/api/deals?${p}`);
    if (!res.ok) return;
    const d = (await res.json()) as { deals: Deal[]; bookmarks: Record<string, string | null> };
    setDeals(d.deals);
    setBookmarks(d.bookmarks);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleBm = async (id: string) => {
    if (bookmarks[id] !== undefined) {
      await fetch(`/api/deals/${id}/bookmark`, { method: "DELETE" });
      const next = { ...bookmarks };
      delete next[id];
      setBookmarks(next);
    } else {
      await fetch(`/api/deals/${id}/bookmark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: null }),
      });
      setBookmarks((b) => ({ ...b, [id]: null }));
    }
  };

  const practiceQs = async (id: string) => {
    setPractice("…");
    const res = await fetch(`/api/deals/${id}/practice`, { method: "POST" });
    setPractice(null);
    if (!res.ok) {
      const e = (await res.json()) as { error?: string };
      alert(e.error ?? "Failed");
      return;
    }
    const { questions } = (await res.json()) as { questions: string };
    alert(questions);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Deal Tracker</h1>
        <p className="mt-1 text-sm text-zinc-400">
          <span className="text-emerald-400/90">SHARED</span> feed · <span className="text-cyan-400/90">PRIVATE</span> bookmarks
        </p>
      </div>
      <Card className="flex flex-wrap gap-2 border-zinc-800 bg-zinc-900/50 p-3">
        <Input
          placeholder="Deal type (LBO, M&A, IPO…)"
          className="max-w-[140px]"
          value={filters.dealType}
          onChange={(e) => setFilters((f) => ({ ...f, dealType: e.target.value }))}
        />
        <Input
          placeholder="Sector"
          className="max-w-[140px]"
          value={filters.sector}
          onChange={(e) => setFilters((f) => ({ ...f, sector: e.target.value }))}
        />
        <Input
          placeholder="Size text"
          className="max-w-[120px]"
          value={filters.size}
          onChange={(e) => setFilters((f) => ({ ...f, size: e.target.value }))}
        />
        <Button size="sm" onClick={() => void load()}>
          Apply
        </Button>
      </Card>
      <div className="space-y-3">
        {deals.map((d) => (
          <Card key={d.id} id={d.id} className="space-y-2 border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-zinc-100">{d.title}</h2>
                <p className="text-xs text-zinc-500">
                  {d.acquirer ?? "?"} → {d.target ?? "?"} · {new Date(d.announcedAt).toLocaleDateString()}
                </p>
              </div>
              {d.dealValue ? (
                <span className="rounded border border-amber-700/50 bg-amber-950/40 px-2 py-0.5 text-xs text-amber-200">
                  {d.dealValue}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-zinc-500">{d.dealType}{d.sector ? ` · ${d.sector}` : ""}</p>
            <p className="text-sm text-zinc-300">{d.summary}</p>
            {d.keyThesis ? (
              <div>
                <p className="text-xs font-semibold text-zinc-500">Why this deal</p>
                <p className="text-sm text-zinc-400">{d.keyThesis}</p>
              </div>
            ) : null}
            {d.risks ? <p className="text-xs text-red-300/90">Risks: {d.risks}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => void toggleBm(d.id)}>
                {bookmarks[d.id] !== undefined ? "Remove bookmark" : "Bookmark"}
              </Button>
              <Button size="sm" variant="outline" disabled={practice === "…"} onClick={() => void practiceQs(d.id)}>
                Practice questions
              </Button>
              {d.sourceUrl ? (
                <Button asChild size="sm" variant="ghost">
                  <a href={d.sourceUrl} target="_blank" rel="noreferrer">
                    Source
                  </a>
                </Button>
              ) : null}
              <Button asChild size="sm" variant="ghost">
                <Link href={`/research`}>Research firms</Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
