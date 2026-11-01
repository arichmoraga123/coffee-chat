"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export type ClubResource = { id: string; title: string; author: string; posted: string; files: number; tags: string[]; snippet: string };

/** Tools → Resources: every PE@Broad Resource post, searchable. */
export function ClubResourcesSection({ items }: { items: ClubResource[] }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? items.filter((i) => `${i.title} ${i.tags.join(" ")} ${i.snippet}`.toLowerCase().includes(n)) : items;
  }, [items, q]);
  return (
    <section className="space-y-3 rounded-[var(--radius-lg)] border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="section-title">From PE@Broad</h2>
          <p className="text-[13px] text-ink-3">Resources your officers shared with the club.</p>
        </div>
        {items.length > 4 ? (
          <div className="relative w-full sm:w-60">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-ink-3" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search club resources" className="pl-8" aria-label="Search club resources" />
          </div>
        ) : null}
      </div>
      {shown.length ? (
        <ul className="divide-y divide-divider">
          {shown.slice(0, 30).map((r) => (
            <li key={r.id} className="py-2.5">
              <Link href={`/club/content/${r.id}`} className="font-medium text-ink hover:underline">
                {r.title}
              </Link>
              <p className="text-[13px] text-ink-3">
                {r.author} · {r.posted}
                {r.files ? ` · ${r.files} file${r.files === 1 ? "" : "s"}` : ""}
                {r.tags.length ? ` · ${r.tags.join(", ")}` : ""}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-3">Nothing matches.</p>
      )}
    </section>
  );
}
