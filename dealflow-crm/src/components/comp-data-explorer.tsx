"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Entry = {
  id: string;
  firmName: string;
  role: string;
  vertical: string;
  officeLocation: string | null;
  baseComp: number | null;
  signingBonus: number | null;
  yearEndBonus: number | null;
  totalComp: number | null;
  year: number;
  upvotes: number;
  schoolType: string;
};

export function CompDataExplorer({ loggedIn }: { loggedIn: boolean }) {
  const [firmName, setFirmName] = useState("");
  const [role, setRole] = useState("");
  const [vertical, setVertical] = useState("");
  const [year, setYear] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const p = new URLSearchParams();
    if (firmName.trim()) p.set("firmName", firmName.trim());
    if (role.trim()) p.set("role", role.trim());
    if (vertical.trim()) p.set("vertical", vertical.trim());
    if (year.trim()) p.set("year", year.trim());
    const res = await fetch(`/api/comp-data?${p.toString()}`);
    if (res.ok) {
      const d = (await res.json()) as { entries: Entry[] };
      setEntries(d.entries ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  const upvote = async (id: string) => {
    const res = await fetch(`/api/comp-data/${id}/upvote`, { method: "POST" });
    if (res.ok) void load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50">Comp data</h1>
          <p className="mt-1 text-sm text-zinc-500">Crowdsourced, anonymized entries. School shown as target tier only.</p>
        </div>
        {loggedIn ? (
          <Link href="/comp/submit">
            <Button type="button" size="sm">
              Submit comp
            </Button>
          </Link>
        ) : (
          <Link href="/login" className="text-sm text-amber-200/90 hover:underline">
            Log in to submit
          </Link>
        )}
      </div>

      <Card className="border-zinc-800 bg-zinc-900/50 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
            placeholder="Firm"
            value={firmName}
            onChange={(e) => setFirmName(e.target.value)}
          />
          <input
            className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
            placeholder="Role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <input
            className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
            placeholder="Vertical"
            value={vertical}
            onChange={(e) => setVertical(e.target.value)}
          />
          <input
            className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-100"
            placeholder="Year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>
        <Button type="button" size="sm" className="mt-3" variant="outline" onClick={() => void load()} disabled={loading}>
          Apply filters
        </Button>
      </Card>

      {loading ? <p className="text-sm text-zinc-500">Loading…</p> : null}

      <div className="space-y-2">
        {entries.map((e) => (
          <Card key={e.id} className="border-zinc-800 bg-zinc-950/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-zinc-100">
                  {e.firmName} · {e.role}
                </p>
                <p className="text-xs text-zinc-500">
                  {e.vertical} · {e.year} · school tier: {e.schoolType}
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  Base {e.baseComp ?? "—"} · Signing {e.signingBonus ?? "—"} · YE bonus {e.yearEndBonus ?? "—"} · Total{" "}
                  {e.totalComp ?? "—"}
                </p>
              </div>
              {loggedIn ? (
                <Button type="button" size="sm" variant="outline" onClick={() => void upvote(e.id)}>
                  Upvote ({e.upvotes})
                </Button>
              ) : (
                <span className="text-xs text-zinc-500">{e.upvotes} upvotes</span>
              )}
            </div>
          </Card>
        ))}
        {!loading && entries.length === 0 ? <p className="text-sm text-zinc-500">No entries match.</p> : null}
      </div>
    </div>
  );
}
