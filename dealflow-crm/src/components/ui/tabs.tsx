"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type TabItem = { href?: string; value?: string; label: string; active: boolean };

/** Underline tabs. Pass hrefs for route tabs, or values + onSelect for in-page tabs. */
export function Tabs({ items, onSelect, className }: { items: TabItem[]; onSelect?: (value: string) => void; className?: string }) {
  return (
    <div role="tablist" className={cn("-mb-px flex gap-6 overflow-x-auto border-b border-border", className)}>
      {items.map((t) => {
        const cls = cn(
          "-mb-px shrink-0 border-b-2 px-0.5 pb-2.5 pt-1 text-sm transition-colors",
          t.active ? "border-accent font-semibold text-accent" : "border-transparent text-ink-2 hover:text-ink",
        );
        return t.href ? (
          <Link key={t.label} href={t.href} role="tab" aria-selected={t.active} className={cls}>
            {t.label}
          </Link>
        ) : (
          <button key={t.label} type="button" role="tab" aria-selected={t.active} className={cls} onClick={() => onSelect?.(t.value ?? t.label)}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
