"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { subMonths, startOfDay } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEAL_TYPE_OPTIONS, VERTICAL_OPTIONS } from "@/lib/deal-taxonomy";
import { useCareerTracks } from "@/components/career-track-provider";
import { matchesCareerTracks } from "@/lib/career-tracks";
import { DealDetailPanel } from "@/components/deal-detail-panel";
import { Select } from "@/components/ui/select";

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
  careerTracks: string[];
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
  const { careerTracks, narrowTrack } = useCareerTracks();
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [bookmarks, setBookmarks] = useState<Record<string, string | null | undefined>>(initialBookmarks);
  const [filters, setFilters] = useState({ dealType: "", vertical: "", sector: "", size: "" });
  const [tab, setTab] = useState<"current" | "archive">("current");
  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const tabDeals = useMemo(() => {
    return deals
      .filter((d) => matchesCareerTracks(d.careerTracks ?? [], careerTracks, narrowTrack))
      .filter((d) => (tab === "current" ? isCurrentDeal(d.announcedAt) : !isCurrentDeal(d.announcedAt)));
  }, [deals, tab, careerTracks, narrowTrack]);

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
    setDeals(
      (d.deals ?? []).map((row) => ({
        ...row,
        careerTracks: row.careerTracks ?? [],
      })),
    );
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

  // Deep link: /deals#<id> opens that deal.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) setOpenDealId(id);
  }, []);

  const openDeal = deals.find((d) => d.id === openDealId) ?? null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Deal Tracker</h1>
        <p className="mt-1 text-sm text-ink-3">
          Real announced transactions, updated daily from the news. Click any deal to prep it for &ldquo;tell me about a
          deal&rdquo; or turn it into a stock pitch.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
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
        <span className="ml-auto self-center text-xs text-ink-3">
          Current = announced within the last 6 months
        </span>
      </div>

      {tab === "archive" ? (
        <p className="rounded border border-border bg-surface px-3 py-2 text-sm text-ink-2">
          These deals may no longer be current but are saved for reference and interview prep.
        </p>
      ) : null}

      {loadError ? (
        <p className="rounded border border-warn/40 bg-warn-bg px-3 py-2 text-sm text-warn">{loadError}</p>
      ) : null}
      <Card className="flex flex-wrap items-center gap-2 border-border bg-surface p-3">
        <label className="text-xs text-ink-3">
          <span className="mb-0.5 block">Deal type</span>
          <Select
            className="min-w-[140px]"
            value={filters.dealType}
            onChange={(e) => setFilters((f) => ({ ...f, dealType: e.target.value }))}
          >
            <option value="">All</option>
            {DEAL_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-xs text-ink-3">
          <span className="mb-0.5 block">Vertical</span>
          <Select
            className="min-w-[160px]"
            value={filters.vertical}
            onChange={(e) => setFilters((f) => ({ ...f, vertical: e.target.value }))}
          >
            <option value="">All</option>
            {VERTICAL_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </Select>
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
          <p className="text-sm text-ink-3">
            {tab === "current" ? "No deals in the current window — try Archive or adjust filters." : "No archived deals match these filters."}
          </p>
        ) : null}
        {tabDeals.map((d) => (
          <Card
            key={d.id}
            id={d.id}
            role="button"
            tabIndex={0}
            onClick={() => setOpenDealId(d.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setOpenDealId(d.id);
            }}
            className="cursor-pointer space-y-2 border-border bg-surface p-4 transition hover:border-accent hover:bg-surface"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-ink">{d.title}</h2>
                <p className="text-xs text-ink-3">
                  {d.acquirer ?? "?"} → {d.target ?? "?"} · {new Date(d.announcedAt).toLocaleDateString()}
                </p>
              </div>
              {d.dealValue ? (
                <span className="rounded border border-warn/40 bg-warn-bg px-2 py-0.5 text-xs text-warn">
                  {d.dealValue}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-ink-3">
              {d.dealType}
              {d.vertical ? ` · ${d.vertical}` : ""}
              {d.sector ? ` · ${d.sector}` : ""}
            </p>
            <p className="line-clamp-3 text-sm text-ink-2">{d.summary}</p>
            {d.keyThesis ? (
              <div>
                <p className="text-xs font-semibold text-ink-3">Why this deal</p>
                <p className="text-sm text-ink-2">{d.keyThesis}</p>
              </div>
            ) : null}
            {d.risks ? <p className="text-xs text-danger">Risks: {d.risks}</p> : null}
            <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" onClick={() => setOpenDealId(d.id)}>
                Tell me about this deal
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setOpenDealId(d.id);
                }}
              >
                Practice · Stock pitch
              </Button>
              <Button size="sm" variant="outline" onClick={() => void toggleBm(d.id)}>
                {bookmarks[d.id] !== undefined ? "Remove bookmark" : "Bookmark"}
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
      {openDeal ? (
        <DealDetailPanel
          deal={openDeal}
          onClose={() => {
            setOpenDealId(null);
            if (window.location.hash) history.replaceState(null, "", window.location.pathname);
          }}
        />
      ) : null}
    </div>
  );
}
