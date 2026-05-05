"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type G = { id: string; name: string; role: string; memberCount: number };

export function GroupsView() {
  const [groups, setGroups] = useState<G[]>([]);
  const [name, setName] = useState("");

  const load = async () => {
    const res = await fetch("/api/study-groups");
    if (!res.ok) return;
    const d = (await res.json()) as { groups: G[] };
    setGroups(d.groups);
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    if (!name.trim()) return;
    const res = await fetch("/api/study-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (!res.ok) return;
    setName("");
    void load();
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Study groups</h1>
        <p className="mt-1 text-sm text-zinc-400">
          <span className="text-emerald-400/90">SHARED</span> inside the group only · invite by email (must already have an account)
        </p>
      </div>
      <div className="flex flex-wrap gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
        <Input placeholder="New group name" value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
        <Button size="sm" onClick={() => void create()}>
          Create
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((g) => (
          <Link
            key={g.id}
            href={`/groups/${g.id}`}
            className="block rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 transition-colors hover:border-cyan-800/50"
          >
            <p className="font-semibold text-cyan-300">{g.name}</p>
            <p className="text-xs text-zinc-500">
              {g.memberCount} members · you are {g.role}
            </p>
          </Link>
        ))}
      </div>
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-sm text-zinc-400">
        Group leaderboard uses each member&apos;s streak / XP from their profile.{" "}
        <Button asChild size="sm" variant="outline" className="ml-2">
          <Link href="/questions">MCQ challenge → Question Bank</Link>
        </Button>
      </div>
    </div>
  );
}
