"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type ContentCard = {
  id: string;
  type: string;
  typeLabel: string;
  title: string;
  author: string;
  posted: string;
  due: string | null;
  overdue: boolean;
  done: boolean;
  allowDone: boolean;
  files: number;
  tags: string[];
  archived: boolean;
  audience: string | null;
};

const CHIPS = [
  { v: "all", l: "All" },
  { v: "resource", l: "Resources" },
  { v: "assignment", l: "Assignments" },
  { v: "reading", l: "Readings" },
  { v: "case_study", l: "Case studies" },
];

export function ContentBrowser({ items, showArchived }: { items: ContentCard[]; showArchived: boolean }) {
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((i) => (type === "all" || i.type === type) && (!needle || `${i.title} ${i.tags.join(" ")} ${i.author}`.toLowerCase().includes(needle)));
  }, [items, type, q]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.v}
            type="button"
            aria-pressed={type === c.v}
            onClick={() => setType(c.v)}
            className={cn("rounded-full border px-3 py-1 text-[13px]", type === c.v ? "border-accent bg-accent-tint font-semibold text-accent" : "border-border-strong text-ink-2 hover:bg-surface-2")}
          >
            {c.l}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-ink-3" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search content" className="pl-8" aria-label="Search content" />
        </div>
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-ink-3">{items.length ? "Nothing matches." : "Nothing posted yet."}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((i) => (
            <Link key={i.id} href={`/club/content/${i.id}`} className={cn("flex flex-col rounded-[var(--radius-lg)] border border-border bg-surface p-4 transition-colors hover:border-border-strong", i.archived && "opacity-60")}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-accent">{i.typeLabel}</span>
                {i.done ? <span className="rounded bg-success-bg px-1.5 py-0.5 text-xs font-medium text-success">Done</span> : i.archived ? <span className="text-xs text-ink-3">Archived</span> : null}
              </div>
              <p className="mt-1 font-medium text-ink [overflow-wrap:anywhere]">{i.title}</p>
              <p className="mt-1 text-[13px] text-ink-3">
                {i.author} · {i.posted}
                {i.files ? ` · ${i.files} file${i.files === 1 ? "" : "s"}` : ""}
              </p>
              {i.due ? <p className={cn("mt-auto pt-2 text-[13px]", i.overdue && !i.done ? "text-warn" : "text-ink-2")}>Due {i.due}</p> : null}
              {showArchived && i.audience && i.audience !== "All members" ? <p className="pt-1 text-xs text-ink-3">For {i.audience}</p> : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
