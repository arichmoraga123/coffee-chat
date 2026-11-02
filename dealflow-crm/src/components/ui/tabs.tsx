"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabItem = { href?: string; value?: string; label: string; active: boolean };

const MAX_BEFORE_MORE = 6;
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Underline tabs. Pass hrefs for route tabs, or values + onSelect for in-page tabs.
 * Never shows a vertical scrollbar. Rows longer than 6 tabs that don't fit move the rest into "More ▾";
 * anything still too wide scrolls sideways (hidden scrollbar, fade edge, chevron buttons).
 */
export function Tabs({ items, onSelect, className }: { items: TabItem[]; onSelect?: (value: string) => void; className?: string }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const fullWidth = useRef(0);
  const [collapsed, setCollapsed] = useState(false);
  const [edges, setEdges] = useState({ left: false, right: false });
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const canCollapse = items.length > MAX_BEFORE_MORE;

  const measure = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    if (!collapsed) fullWidth.current = row.scrollWidth;
    if (canCollapse) {
      if (!collapsed && row.scrollWidth > row.clientWidth + 1) setCollapsed(true);
      else if (collapsed && fullWidth.current && row.clientWidth >= fullWidth.current) setCollapsed(false);
    }
    setEdges({ left: row.scrollLeft > 1, right: row.scrollLeft + row.clientWidth < row.scrollWidth - 1 });
  }, [collapsed, canCollapse]);

  useIsoLayoutEffect(() => {
    measure();
    const row = rowRef.current;
    if (!row || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(row);
    return () => ro.disconnect();
  }, [measure, items.length]);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [moreOpen]);

  // Keep the active tab in view when the row scrolls.
  useEffect(() => {
    const el = rowRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [items]);

  const visible = collapsed ? items.slice(0, MAX_BEFORE_MORE) : items;
  const hidden = collapsed ? items.slice(MAX_BEFORE_MORE) : [];
  const hiddenActive = hidden.find((t) => t.active);

  const tabCls = (active: boolean) =>
    cn(
      "-mb-px shrink-0 whitespace-nowrap border-b-2 px-0.5 pb-2.5 pt-1 text-sm transition-colors",
      active ? "border-accent font-semibold text-accent" : "border-transparent text-ink-2 hover:text-ink",
    );

  const render = (t: TabItem, extra?: { onClick?: () => void; className?: string; role?: string }) =>
    t.href ? (
      <Link
        key={t.label}
        href={t.href}
        role={extra?.role ?? "tab"}
        aria-selected={extra?.role ? undefined : t.active}
        className={extra?.className ?? tabCls(t.active)}
        onClick={extra?.onClick}
      >
        {t.label}
      </Link>
    ) : (
      <button
        key={t.label}
        type="button"
        role={extra?.role ?? "tab"}
        aria-selected={extra?.role ? undefined : t.active}
        className={extra?.className ?? tabCls(t.active)}
        onClick={() => {
          onSelect?.(t.value ?? t.label);
          extra?.onClick?.();
        }}
      >
        {t.label}
      </button>
    );

  const scrollBy = (dir: 1 | -1) => rowRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });

  return (
    <div className={cn("relative flex items-end border-b border-border", className)}>
      <div className="relative min-w-0 flex-1">
        <div
          ref={rowRef}
          role="tablist"
          onScroll={measure}
          className="no-scrollbar -mb-px flex h-auto gap-6 overflow-x-auto overflow-y-hidden"
        >
          {visible.map((t) => render(t))}
        </div>
        {edges.left ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center bg-linear-to-r from-bg to-transparent">
            <button
              type="button"
              aria-label="Scroll tabs left"
              onClick={() => scrollBy(-1)}
              className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        {edges.right ? (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex w-12 items-center justify-end bg-linear-to-l from-bg to-transparent">
            <button
              type="button"
              aria-label="Scroll tabs right"
              onClick={() => scrollBy(1)}
              className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
      {hidden.length ? (
        <div ref={moreRef} className="relative ml-6 shrink-0">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen((o) => !o)}
            className={cn(tabCls(Boolean(hiddenActive)), "inline-flex items-center gap-1")}
          >
            {hiddenActive ? hiddenActive.label : "More"}
            <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </button>
          {moreOpen ? (
            <div role="menu" className="absolute right-0 top-full z-30 mt-1 min-w-44 rounded-[var(--radius)] border border-border bg-surface py-1 shadow-lg">
              {hidden.map((t) =>
                render(t, {
                  role: "menuitem",
                  onClick: () => setMoreOpen(false),
                  className: cn(
                    "block w-full px-3 py-2 text-left text-sm hover:bg-surface-2",
                    t.active ? "font-semibold text-accent" : "text-ink-2",
                  ),
                }),
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
