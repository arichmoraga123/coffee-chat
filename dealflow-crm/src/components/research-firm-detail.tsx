"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Firm = {
  id: string;
  firmName: string;
  firmType: string;
  aum: string | null;
  founded: number | null;
  headquarters: string | null;
  description: string | null;
  investmentFocus: string | null;
  dealSize: string | null;
  notableDeals: string[];
  whatTheyLookFor: string | null;
  hiringTimeline: string | null;
  interviewProcess: string | null;
  culture: string | null;
  msuAlumni: string[];
  websiteUrl: string | null;
  linkedinUrl: string | null;
};

type Deal = { id: string; title: string; dealValue: string | null; announcedAt: string };

export function ResearchFirmDetail({ initial, relatedDeals }: { initial: Firm; relatedDeals: Deal[] }) {
  const router = useRouter();
  const [f, setF] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const res = await fetch(`/api/research/${f.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firmType: f.firmType,
        aum: f.aum,
        founded: f.founded == null || Number.isNaN(Number(f.founded)) ? null : Number(f.founded),
        headquarters: f.headquarters,
        description: f.description,
        investmentFocus: f.investmentFocus,
        dealSize: f.dealSize,
        notableDeals: f.notableDeals,
        whatTheyLookFor: f.whatTheyLookFor,
        hiringTimeline: f.hiringTimeline,
        interviewProcess: f.interviewProcess,
        culture: f.culture,
        msuAlumni: f.msuAlumni,
        websiteUrl: f.websiteUrl,
        linkedinUrl: f.linkedinUrl,
      }),
    });
    setBusy(false);
    if (res.ok) {
      const data = (await res.json()) as Firm;
      setF(data);
      setEditing(false);
      router.refresh();
    }
  };

  const field = (label: string, key: keyof Firm, multiline = false, numberField = false) => (
    <div>
      <label className="mb-1 block text-xs text-zinc-500">{label}</label>
      {editing ? (
        multiline ? (
          <textarea
            className="min-h-[72px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm"
            value={String(f[key] ?? "")}
            onChange={(e) => setF((p) => ({ ...p, [key]: e.target.value }))}
          />
        ) : (
          <Input
            type={numberField ? "number" : "text"}
            value={f[key] == null ? "" : String(f[key])}
            onChange={(e) =>
              setF((p) => ({
                ...p,
                [key]: numberField ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value,
              }))
            }
          />
        )
      ) : (
        <p className="text-sm text-zinc-200">{f[key] != null && f[key] !== "" ? String(f[key]) : "—"}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/research" className="text-xs text-[#888888] underline-offset-4 hover:text-[#f0f0f0] hover:underline">
          ← All firms
        </Link>
        <Button size="sm" variant={editing ? "default" : "outline"} onClick={() => (editing ? void save() : setEditing(true))}>
          {editing ? (busy ? "Saving…" : "Save") : "Edit"}
        </Button>
      </div>
      <h1 className="text-2xl font-semibold text-zinc-100">{f.firmName}</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 border-zinc-800 bg-zinc-900/50 p-4 text-sm">
          {field("Type", "firmType")}
          {field("AUM", "aum")}
          {field("Founded", "founded", false, true)}
          {field("HQ", "headquarters")}
          {field("Description", "description", true)}
          {field("Investment focus", "investmentFocus", true)}
          {field("Typical deal size", "dealSize")}
          {field("What they look for", "whatTheyLookFor", true)}
          {field("Hiring timeline", "hiringTimeline", true)}
          {field("Culture", "culture", true)}
          {field("Website", "websiteUrl")}
          {field("LinkedIn", "linkedinUrl")}
        </Card>
        <div className="space-y-4">
          <Card className="space-y-2 border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="font-semibold text-zinc-200">Notable deals (Deal Tracker)</h2>
            <p className="text-xs text-zinc-500">SHARED deals linked by name match.</p>
            <ul className="space-y-2 text-sm">
              {relatedDeals.length === 0 ? (
                <li className="text-zinc-500">No matching deals yet.</li>
              ) : (
                relatedDeals.map((d) => (
                  <li key={d.id}>
                    <Link className="text-[#f0f0f0] underline-offset-4 hover:underline" href={`/deals#${d.id}`}>
                      {d.title}
                    </Link>
                    {d.dealValue ? <span className="ml-2 text-zinc-500">{d.dealValue}</span> : null}
                  </li>
                ))
              )}
            </ul>
            <Button asChild size="sm" variant="outline">
              <Link href="/deals">Open Deal Tracker</Link>
            </Button>
          </Card>
          <Card className="space-y-2 border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="font-semibold text-zinc-200">Interview intel</h2>
            <p className="text-xs text-zinc-500">Curated in wiki; your private debriefs stay under Debriefs.</p>
            {editing ? (
              <textarea
                className="min-h-[120px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm"
                value={f.interviewProcess ?? ""}
                onChange={(e) => setF((p) => ({ ...p, interviewProcess: e.target.value }))}
              />
            ) : (
              <p className="text-sm text-zinc-300">{f.interviewProcess ?? "—"}</p>
            )}
            <Button asChild size="sm" variant="outline">
              <Link href="/debriefs">Log private debrief</Link>
            </Button>
          </Card>
          <Card className="space-y-2 border-zinc-800 bg-zinc-900/50 p-4">
            <h2 className="font-semibold text-zinc-200">MSU / Broad alumni</h2>
            {editing ? (
              <textarea
                className="min-h-[80px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm"
                placeholder="One name per line"
                value={f.msuAlumni.join("\n")}
                onChange={(e) =>
                  setF((p) => ({
                    ...p,
                    msuAlumni: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
              />
            ) : (
              <ul className="list-inside list-disc text-sm text-zinc-300">
                {f.msuAlumni.length ? f.msuAlumni.map((n) => <li key={n}>{n}</li>) : <li className="list-none text-zinc-500">None listed</li>}
              </ul>
            )}
            <Button asChild size="sm" variant="outline">
              <Link href="/contacts">Add contacts in Rolodex</Link>
            </Button>
          </Card>
        </div>
      </div>
      {editing ? (
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Notable deals (one per line)</label>
          <textarea
            className="min-h-[80px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm"
            value={f.notableDeals.join("\n")}
            onChange={(e) =>
              setF((p) => ({
                ...p,
                notableDeals: e.target.value
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
              }))
            }
          />
        </div>
      ) : null}
    </div>
  );
}
