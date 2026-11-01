"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

export type SchoolCard = {
  id: string;
  name: string;
  shortName: string;
  type: string;
  location: string | null;
  memberCount: number;
  questionsContributed: number;
};

export function SchoolsSearch({ schools }: { schools: SchoolCard[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return schools;
    return schools.filter((x) => x.name.toLowerCase().includes(s) || x.shortName.toLowerCase().includes(s));
  }, [schools, q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Schools</h1>
        <p className="mt-1 text-sm text-ink-3">Verified schools on Prospect.</p>
      </div>
      <input
        type="search"
        placeholder="Search by school name…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full max-w-md rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-3"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <Link key={s.id} href={`/schools/${s.id}`}>
            <Card className="h-full border-border bg-surface p-4 transition-colors hover:border-border-strong">
              <p className="text-lg font-medium text-ink">{s.name}</p>
              <p className="text-xs text-ink-3">{s.location}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-ink-2">
                <span className="rounded bg-surface-2 px-2 py-0.5 capitalize text-ink-2">{s.type.replace(/-/g, " ")}</span>
                <span>{s.memberCount} members</span>
                <span>{s.questionsContributed} questions</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
      {filtered.length === 0 ? <p className="text-sm text-ink-3">No schools match.</p> : null}
    </div>
  );
}
