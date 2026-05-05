"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { subMonths, startOfDay } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEAL_TYPE_OPTIONS, VERTICAL_OPTIONS } from "@/lib/deal-taxonomy";

type Deal = {
  id: string;
  title: string;
  acquirer: string | null;
  target: string | null;
  dealValue: string | null;
  dealType: string;
  vertical: string | null;
  sector: string | null;
  summary: string;
  keyThesis: string | null;
  risks: string | null;
  sourceUrl: string | null;
  announcedAt: string;
};

function isCurrentDeal(announcedAt: string): boolean {
  const cutoff = startOfDay(subMonths(new Date(), 6));
  return new Date(announcedAt).getTime() >= cutoff.getTime();
}

export function DealsView({
  initialDeals = [],
  initialBookmarks = {},
}: {
  initialDeals?: Deal[];
  initialBookmarks?: Record<string, string | null | undefined>;
}) {
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [bookmarks, setBookmarks] = useState<Record<string, string | null | undefined>>(initialBookmarks);
  const [filters, setFilters] = useState({ dealType: "", vertical: "", sector: "", size: "" });
  const [tab, setTab] = useState<"current" | "archive">("current");
  const [practice, setPractice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const tabDeals = useMemo(() => {
    return deals.filter((d) =>
      tab === "current" ? isCurrentDeal(d.announcedAt) : !isCurrentDeal(d.announcedAt),
    );
  }, [deals, tab]);

  const load = async () => {
    setLoadError(null);
    const p = new URLSearchParams();
    if (filters.dealType) p.set("dealType", filters.dealType);
    if (filters.vertical) p.set("vertical", filters.vertical);
    if (filters.sector) p.set("sector", filters.sector);
    if (filters.size) p.set("size", filters.size);
    const q = p.toString();
    const res = await fetch(q ? `/api/deals?${q}` : "/api/deals", { credentials: "same-origin" });
    if (!res.ok) {
      setLoadError(res.status === 401 ? "Session expired — refresh the page." : "Could not load deals.");
      return;
    }
    const d = (await res.json()) as { deals: Deal[]; bookmarks: Record<string, string | null> };
    setDeals(d.deals);
    setBookmarks(d.bookmarks);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleBm = async (id: string) => {
    if (bookmarks[id] !== undefined) {
      await fetch(`/api/deals/${id}/bookmark`, { method: "DELETE", credentials: "same-origin" });
      const next = { ...bookmarks };
      delete next[id];
      setBookmarks(next);
    } else {
      await fetch(`/api/deals/${id}/bookmark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ notes: null }),
      });
      setBookmarks((b) => ({ ...b, [id]: null }));
    }
  };

  const practiceQs = async (id: string) => {
    setPractice("…");
    const res = await fetch(`/api/deals/${id}/practice`, {
      method: "POST",
      credentials: "same-origin",
    });
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
        <h1 className="page-title">Deal Tracker</h1>
        <p className="mt-1 text-sm text-[#888888]">
          <span className="text-[#f0f0f0]">SHARED</span> feed · <span className="text-[#c9a84c]">PRIVATE</span> bookmarks
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
        <Button
          type="button"
          size="sm"
          variant={tab === "current" ? "default" : "outline"}
          onClick={() => setTab("current")}
        >
          Current
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tab === "archive" ? "default" : "outline"}
          onClick={() => setTab("archive")}
        >
          Archive
        </Button>
        <span className="ml-auto self-center text-xs text-zinc-500">
          Current = announced within the last 6 months
        </span>
      </div>

      {tab === "archive" ? (
        <p className="rounded border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-400">
          These deals may no longer be current but are saved for reference and interview prep.
        </p>
      ) : null}

      {loadError ? (
        <p className="rounded border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">{loadError}</p>
      ) : null}
      <Card className="flex flex-wrap items-center gap-2 border-zinc-800 bg-zinc-900/50 p-3">
        <label className="text-xs text-zinc-500">
          <span className="mb-0.5 block">Deal type</span>
          <select
            className="h-9 min-w-[140px] rounded border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-200"
            value={filters.dealType}
            onChange={(e) => setFilters((f) => ({ ...f, dealType: e.target.value }))}
          >
            <option value="">All</option>
            {DEAL_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-zinc-500">
          <span className="mb-0.5 block">Vertical</span>
          <select
            className="h-9 min-w-[160px] rounded border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-200"
            value={filters.vertical}
            onChange={(e) => setFilters((f) => ({ ...f, vertical: e.target.value }))}
          >
            <option value="">All</option>
            {VERTICAL_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
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
        {tabDeals.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {tab === "current" ? "No deals in the current window — try Archive or adjust filters." : "No archived deals match these filters."}
          </p>
        ) : null}
        {tabDeals.map((d) => (
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
            <p className="text-xs text-zinc-500">
              {d.dealType}
              {d.vertical ? ` · ${d.vertical}` : ""}
              {d.sector ? ` · ${d.sector}` : ""}
            </p>
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
                  <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer">
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
