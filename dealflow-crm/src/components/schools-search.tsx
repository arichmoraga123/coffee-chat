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
        <h1 className="text-2xl font-semibold text-zinc-50">Schools</h1>
        <p className="mt-1 text-sm text-zinc-500">Verified schools on Prospect.</p>
      </div>
      <input
        type="search"
        placeholder="Search by school name…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <Link key={s.id} href={`/schools/${s.id}`}>
            <Card className="h-full border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-zinc-600">
              <p className="text-lg font-medium text-zinc-100">{s.name}</p>
              <p className="text-xs text-zinc-500">{s.location}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-400">
                <span className="rounded bg-zinc-800 px-2 py-0.5 capitalize text-zinc-300">{s.type.replace(/-/g, " ")}</span>
                <span>{s.memberCount} members</span>
                <span>{s.questionsContributed} questions</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
      {filtered.length === 0 ? <p className="text-sm text-zinc-500">No schools match.</p> : null}
    </div>
  );
}
