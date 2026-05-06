"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PitchList = { id: string; companyName: string; recommendation: string; updatedAt: string; sharedToGroupId: string | null };
type GroupOpt = { id: string; name: string };

function BulletInputs({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-zinc-500">{label}</p>
      {[0, 1, 2].map((i) => (
        <Input
          key={i}
          className="text-sm"
          placeholder={`Bullet ${i + 1}`}
          value={values[i] ?? ""}
          onChange={(e) => {
            const next = [...values];
            next[i] = e.target.value;
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}

export function PitchBuilderView() {
  const searchParams = useSearchParams();
  const [pitches, setPitches] = useState<PitchList[]>([]);
  const [groups, setGroups] = useState<GroupOpt[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shareGroupId, setShareGroupId] = useState("");
  const [busy, setBusy] = useState(false);
  const [outlineBusy, setOutlineBusy] = useState(false);

  const [deckOutline, setDeckOutline] = useState<string | null>(null);

  const [form, setForm] = useState({
    companyName: "",
    overview: "",
    thesis: ["", "", ""] as string[],
    currentPrice: "",
    targetPrice: "",
    catalysts: ["", "", ""] as string[],
    risks: ["", "", ""] as string[],
    recommendation: "Buy" as "Buy" | "Hold" | "Sell",
  });

  const loadPitches = useCallback(async () => {
    const res = await fetch("/api/stock-pitches");
    if (!res.ok) return;
    const d = (await res.json()) as { pitches: PitchList[] };
    setPitches(d.pitches ?? []);
  }, []);

  const loadGroups = useCallback(async () => {
    const res = await fetch("/api/study-groups");
    if (!res.ok) return;
    const d = (await res.json()) as { groups: { id: string; name: string }[] };
    setGroups(d.groups ?? []);
  }, []);

  const loadOne = useCallback(async (id: string) => {
    const res = await fetch(`/api/stock-pitches/${id}`);
    if (!res.ok) return;
    const d = (await res.json()) as {
      pitch: {
        companyName: string;
        overview: string;
        thesisBullets: string[];
        currentPrice: string | null;
        targetPrice: string | null;
        catalysts: string[];
        risks: string[];
        recommendation: string;
        deckOutline: string | null;
      };
    };
    const p = d.pitch;
    setSelectedId(id);
    setDeckOutline(p.deckOutline ?? null);
    setForm({
      companyName: p.companyName,
      overview: p.overview,
      thesis: [p.thesisBullets[0] ?? "", p.thesisBullets[1] ?? "", p.thesisBullets[2] ?? ""],
      currentPrice: p.currentPrice ?? "",
      targetPrice: p.targetPrice ?? "",
      catalysts: [p.catalysts[0] ?? "", p.catalysts[1] ?? "", p.catalysts[2] ?? ""],
      risks: [p.risks[0] ?? "", p.risks[1] ?? "", p.risks[2] ?? ""],
      recommendation: (p.recommendation as "Buy" | "Hold" | "Sell") || "Hold",
    });
  }, []);

  useEffect(() => {
    void loadPitches();
    void loadGroups();
  }, [loadPitches, loadGroups]);

  useEffect(() => {
    const v = searchParams.get("view");
    if (v) void loadOne(v);
  }, [searchParams, loadOne]);

  const save = async () => {
    if (!form.companyName.trim() || !form.overview.trim()) return;
    const priorId = selectedId;
    setBusy(true);
    const payload = {
      companyName: form.companyName.trim(),
      overview: form.overview.trim(),
      thesisBullets: form.thesis.map((s) => s.trim()).filter(Boolean),
      currentPrice: form.currentPrice.trim() || null,
      targetPrice: form.targetPrice.trim() || null,
      catalysts: form.catalysts.map((s) => s.trim()).filter(Boolean),
      risks: form.risks.map((s) => s.trim()).filter(Boolean),
      recommendation: form.recommendation,
    };
    const res = selectedId
      ? await fetch(`/api/stock-pitches/${selectedId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/stock-pitches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    setBusy(false);
    if (!res.ok) return;
    const row = (await res.json()) as { id: string };
    await loadPitches();
    const nextId = priorId ?? row.id;
    if (nextId) await loadOne(nextId);
  };

  const genOutline = async () => {
    if (!selectedId) return;
    setOutlineBusy(true);
    const res = await fetch(`/api/stock-pitches/${selectedId}/outline`, { method: "POST" });
    setOutlineBusy(false);
    if (!res.ok) return;
    await loadOne(selectedId);
  };

  const share = async () => {
    if (!selectedId || !shareGroupId) return;
    const res = await fetch(`/api/stock-pitches/${selectedId}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: shareGroupId }),
    });
    if (res.ok) void loadPitches();
  };

  const del = async () => {
    if (!selectedId || !confirm("Delete this pitch?")) return;
    await fetch(`/api/stock-pitches/${selectedId}`, { method: "DELETE" });
    setSelectedId(null);
    setDeckOutline(null);
    setForm({
      companyName: "",
      overview: "",
      thesis: ["", "", ""],
      currentPrice: "",
      targetPrice: "",
      catalysts: ["", "", ""],
      risks: ["", "", ""],
      recommendation: "Buy",
    });
    void loadPitches();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="page-title">Stock pitch builder</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Draft a pitch, generate a deck outline with Claude, and share to a study group for feedback.
        </p>
      </div>

      <Card className="border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-sm font-medium text-zinc-200">Your pitches</p>
        <ul className="mt-2 space-y-1 text-sm">
          {pitches.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={`text-left hover:underline ${selectedId === p.id ? "text-[#c9a84c]" : "text-zinc-300"}`}
                onClick={() => void loadOne(p.id)}
              >
                {p.companyName} · {p.recommendation}
                {p.sharedToGroupId ? <span className="ml-2 text-xs text-emerald-400">shared</span> : null}
              </button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={() => {
            setSelectedId(null);
            setDeckOutline(null);
            setForm({
              companyName: "",
              overview: "",
              thesis: ["", "", ""],
              currentPrice: "",
              targetPrice: "",
              catalysts: ["", "", ""],
              risks: ["", "", ""],
              recommendation: "Buy",
            });
          }}
        >
          New pitch
        </Button>
      </Card>

      <Card className="space-y-4 border-zinc-800 bg-zinc-900/50 p-4">
        <Input
          placeholder="Company name"
          value={form.companyName}
          onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
        />
        <div>
          <p className="mb-1 text-xs text-zinc-500">Company overview</p>
          <textarea
            className="min-h-[100px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm"
            value={form.overview}
            onChange={(e) => setForm((f) => ({ ...f, overview: e.target.value }))}
          />
        </div>
        <BulletInputs label="Investment thesis (3 bullets)" values={form.thesis} onChange={(t) => setForm((f) => ({ ...f, thesis: t }))} />
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs text-zinc-500">Current price</p>
            <Input value={form.currentPrice} onChange={(e) => setForm((f) => ({ ...f, currentPrice: e.target.value }))} />
          </div>
          <div>
            <p className="mb-1 text-xs text-zinc-500">Target price</p>
            <Input value={form.targetPrice} onChange={(e) => setForm((f) => ({ ...f, targetPrice: e.target.value }))} />
          </div>
        </div>
        <BulletInputs
          label="Catalysts (3)"
          values={form.catalysts}
          onChange={(t) => setForm((f) => ({ ...f, catalysts: t }))}
        />
        <BulletInputs label="Risks (3)" values={form.risks} onChange={(t) => setForm((f) => ({ ...f, risks: t }))} />
        <div>
          <p className="mb-1 text-xs text-zinc-500">Recommendation</p>
          <select
            className="rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
            value={form.recommendation}
            onChange={(e) => setForm((f) => ({ ...f, recommendation: e.target.value as typeof f.recommendation }))}
          >
            <option value="Buy">Buy</option>
            <option value="Hold">Hold</option>
            <option value="Sell">Sell</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => void save()}>
            {busy ? "Saving…" : selectedId ? "Save changes" : "Save pitch"}
          </Button>
          {selectedId ? (
            <>
              <Button type="button" variant="outline" disabled={outlineBusy} onClick={() => void genOutline()}>
                {outlineBusy ? "Generating…" : "Generate pitch deck outline"}
              </Button>
              <Button type="button" variant="destructive" size="sm" onClick={() => void del()}>
                Delete
              </Button>
            </>
          ) : null}
        </div>
        {selectedId ? (
          <div className="border-t border-zinc-800 pt-4">
            <p className="text-sm font-medium text-zinc-200">Share with study group</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <select
                className="rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
                value={shareGroupId}
                onChange={(e) => setShareGroupId(e.target.value)}
              >
                <option value="">Select group…</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <Button type="button" size="sm" variant="outline" disabled={!shareGroupId} onClick={() => void share()}>
                Share for feedback
              </Button>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Members see this pitch on the{" "}
              <Link href="/groups" className="text-zinc-200 underline-offset-2 hover:underline">
                group board
              </Link>
              .
            </p>
          </div>
        ) : null}
      </Card>

      {deckOutline ? (
        <Card className="border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm font-medium text-zinc-200">Deck outline</p>
          <pre className="mt-2 max-h-[480px] overflow-auto whitespace-pre-wrap text-xs text-zinc-300">{deckOutline}</pre>
        </Card>
      ) : null}
    </div>
  );
}
