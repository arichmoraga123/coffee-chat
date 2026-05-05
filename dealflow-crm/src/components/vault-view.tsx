"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Doc = {
  id: string;
  type: string;
  targetFirm: string | null;
  targetRole: string | null;
  outcome: string | null;
  year: number | null;
  school: string | null;
  fileUrl: string | null;
  notes: string | null;
  upvotes: number;
};

export function VaultView() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [upvoted, setUpvoted] = useState<string[]>([]);
  const [filters, setFilters] = useState({ type: "", firm: "", outcome: "", year: "" });
  const [form, setForm] = useState({
    type: "Resume",
    targetFirm: "",
    targetRole: "",
    outcome: "",
    year: "",
    school: "MSU Broad",
    fileUrl: "",
    notes: "",
  });

  const load = async () => {
    const p = new URLSearchParams();
    if (filters.type) p.set("type", filters.type);
    if (filters.firm) p.set("targetFirm", filters.firm);
    if (filters.outcome) p.set("outcome", filters.outcome);
    if (filters.year) p.set("year", filters.year);
    const res = await fetch(`/api/vault?${p}`);
    if (!res.ok) return;
    const d = (await res.json()) as { documents: Doc[]; upvoted: string[] };
    setDocs(d.documents);
    setUpvoted(d.upvoted);
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async () => {
    const res = await fetch("/api/vault", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        year: form.year ? Number(form.year) : null,
      }),
    });
    if (!res.ok) {
      alert("Failed");
      return;
    }
    void load();
  };

  const upvote = async (id: string) => {
    await fetch(`/api/vault/${id}/upvote`, { method: "POST" });
    void load();
  };

  const outcomeBadge = (o: string | null) => {
    if (!o) return <span className="text-zinc-500">—</span>;
    const t = o.toLowerCase();
    if (t.includes("offer")) return <span className="rounded bg-emerald-900/50 px-2 py-0.5 text-xs text-emerald-200">{o}</span>;
    if (t.includes("first") || t.includes("round")) return <span className="rounded bg-amber-900/50 px-2 py-0.5 text-xs text-amber-200">{o}</span>;
    return <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">{o}</span>;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Resume / cover letter vault</h1>
        <p className="mt-1 text-sm text-zinc-400">
          <span className="text-emerald-400/90">SHARED</span> anonymized metadata &amp; Drive links
        </p>
      </div>
      <Card className="border-amber-900/40 bg-amber-950/20 p-3 text-sm text-amber-100/90">
        All documents should be anonymized. Never submit files with personal information you do not want shared.
      </Card>
      <Card className="flex flex-wrap gap-2 border-zinc-800 bg-zinc-900/50 p-3">
        <Input placeholder="Type" className="max-w-[120px]" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))} />
        <Input placeholder="Firm" className="max-w-[120px]" value={filters.firm} onChange={(e) => setFilters((f) => ({ ...f, firm: e.target.value }))} />
        <Input placeholder="Outcome" className="max-w-[120px]" value={filters.outcome} onChange={(e) => setFilters((f) => ({ ...f, outcome: e.target.value }))} />
        <Input placeholder="Year" className="max-w-[80px]" value={filters.year} onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value }))} />
        <Button size="sm" onClick={() => void load()}>
          Filter
        </Button>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {docs.map((d) => (
          <Card key={d.id} className="space-y-2 border-zinc-800 bg-zinc-900/50 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs">{d.type}</span>
              {outcomeBadge(d.outcome)}
              <span className="text-xs text-zinc-500">{d.upvotes} upvotes</span>
            </div>
            <p className="font-medium text-zinc-200">{d.targetFirm ?? "—"}</p>
            <p className="text-xs text-zinc-500">{d.targetRole ?? ""}</p>
            <p className="text-xs text-zinc-500">{d.year ?? ""} · {d.school ?? ""}</p>
            {d.notes ? <p className="line-clamp-2 text-zinc-400">{d.notes}</p> : null}
            <div className="flex flex-wrap gap-2">
              {d.fileUrl ? (
                <Button asChild size="sm">
                  <a href={d.fileUrl} target="_blank" rel="noreferrer">
                    Open Drive
                  </a>
                </Button>
              ) : null}
              <Button size="sm" variant="outline" onClick={() => void upvote(d.id)}>
                {upvoted.includes(d.id) ? "Remove upvote" : "Upvote"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
      <Card className="space-y-2 border-zinc-800 bg-zinc-900/50 p-4">
        <p className="font-medium text-zinc-200">Submit document</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <select className="rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
            <option>Resume</option>
            <option>Cover Letter</option>
          </select>
          <Input placeholder="Target firm" value={form.targetFirm} onChange={(e) => setForm((f) => ({ ...f, targetFirm: e.target.value }))} />
          <Input placeholder="Role" value={form.targetRole} onChange={(e) => setForm((f) => ({ ...f, targetRole: e.target.value }))} />
          <Input placeholder="Outcome" value={form.outcome} onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value }))} />
          <Input placeholder="Year" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} />
          <Input placeholder="School" value={form.school} onChange={(e) => setForm((f) => ({ ...f, school: e.target.value }))} />
          <Input className="sm:col-span-2" placeholder="Google Drive link" value={form.fileUrl} onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))} />
          <textarea className="min-h-[72px] rounded border border-zinc-700 bg-zinc-950 p-2 text-sm sm:col-span-2" placeholder="Tips" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
        <Button size="sm" onClick={() => void submit()}>
          Submit
        </Button>
      </Card>
    </div>
  );
}
