"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { ClubPostReadButton } from "@/components/club-post-read-button";

type Post = {
  id: string;
  title: string;
  type: string;
  dueDate: string | null;
  createdAt: string;
  readBy: string[];
  author: { name: string };
};

const TABS = ["All", "assignment", "reading", "case_study", "project"] as const;

export function ClubContentTabs({ posts, userId }: { posts: Post[]; userId: string }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");

  const filtered = useMemo(() => {
    if (tab === "All") return posts;
    return posts.filter((p) => p.type === tab);
  }, [posts, tab]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              tab === t
                ? "rounded-full border border-border-strong bg-accent px-3 py-1 text-xs font-medium text-on-accent"
                : "rounded-full border border-border bg-surface px-3 py-1 text-xs text-ink-2 hover:border-border-strong"
            }
          >
            {t === "All" ? "All" : t.replace("_", " ")}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map((p) => {
          const read = p.readBy.includes(userId);
          return (
            <Card key={p.id} className="border-border bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-semibold uppercase text-warn">{p.type}</span>
                  <h3 className="text-sm font-medium text-ink">{p.title}</h3>
                  <p className="text-xs text-ink-3">{p.author.name}</p>
                  {p.dueDate ? (
                    <p className="mt-1 text-xs text-ink-2">Due {format(new Date(p.dueDate), "MMM d, yyyy")}</p>
                  ) : null}
                </div>
                <ClubPostReadButton id={p.id} read={read} />
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 ? <p className="text-sm text-ink-3">Nothing in this tab.</p> : null}
      </div>
    </div>
  );
}
