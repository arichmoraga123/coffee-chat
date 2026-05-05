"use client";

import { useMemo, useState } from "react";
import { subMonths, startOfDay } from "date-fns";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

type DealRow = {
  id: string;
  title: string;
  acquirer: string | null;
  target: string | null;
  dealValue: string | null;
  dealType: string;
  sector: string | null;
  summary: string;
  keyThesis: string | null;
  risks: string | null;
  sourceUrl: string | null;
  announcedAt: string;
};

const DEAL_TYPES = ["M&A", "LBO", "IPO", "Recap"] as const;

function trackerTabLabel(announcedAt: string): "Current" | "Archive" {
  const cutoff = startOfDay(subMonths(new Date(), 6));
  return new Date(announcedAt) >= cutoff ? "Current" : "Archive";
}

function emptyForm() {
  return {
    title: "",
    acquirer: "",
    target: "",
    dealValue: "",
    dealType: "M&A" as (typeof DEAL_TYPES)[number],
    sector: "",
    announcedAt: new Date().toISOString().slice(0, 10),
    sourceUrl: "",
    summary: "",
    keyThesis: "",
    risks: "",
  };
}

export function AdminDealsView({ initialDeals }: { initialDeals: DealRow[] }) {
  const router = useRouter();
  const [deals, setDeals] = useState<DealRow[]>(initialDeals);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...deals].sort((a, b) => new Date(b.announcedAt).getTime() - new Date(a.announcedAt).getTime()),
    [deals],
  );

  const refresh = async () => {
    const res = await fetch("/api/deals", { credentials: "same-origin" });
    if (!res.ok) return;
    const d = (await res.json()) as { deals: DealRow[] };
    setDeals(
      d.deals.map((row) => ({
        ...row,
        announcedAt: typeof row.announcedAt === "string" ? row.announcedAt : String(row.announcedAt),
      })),
    );
    router.refresh();
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (row: DealRow) => {
    setEditingId(row.id);
    setForm({
      title: row.title,
      acquirer: row.acquirer ?? "",
      target: row.target ?? "",
      dealValue: row.dealValue ?? "",
      dealType: (DEAL_TYPES.includes(row.dealType as (typeof DEAL_TYPES)[number])
        ? row.dealType
        : "M&A") as (typeof DEAL_TYPES)[number],
      sector: row.sector ?? "",
      announcedAt: new Date(row.announcedAt).toISOString().slice(0, 10),
      sourceUrl: row.sourceUrl ?? "",
      summary: row.summary,
      keyThesis: row.keyThesis ?? "",
      risks: row.risks ?? "",
    });
    setError(null);
    setModalOpen(true);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    const payload = {
      title: form.title.trim(),
      acquirer: form.acquirer.trim() || null,
      target: form.target.trim() || null,
      dealValue: form.dealValue.trim() || null,
      dealType: form.dealType,
      sector: form.sector.trim() || null,
      announcedAt: new Date(form.announcedAt + "T12:00:00").toISOString(),
      sourceUrl: form.sourceUrl.trim() || null,
      summary: form.summary.trim(),
      keyThesis: form.keyThesis.trim() || null,
      risks: form.risks.trim() || null,
    };
    if (!payload.title || !payload.summary) {
      setError("Title and summary are required.");
      setBusy(false);
      return;
    }
    try {
      if (editingId) {
        const res = await fetch(`/api/deals/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          setError(j.error ?? "Update failed");
          setBusy(false);
          return;
        }
      } else {
        const res = await fetch("/api/deals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          setError(j.error ?? "Create failed");
          setBusy(false);
          return;
        }
      }
      setModalOpen(false);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, title: string) => {
    if (!confirm(`Delete deal "${title}"? This removes it from the shared tracker for everyone.`)) return;
    const res = await fetch(`/api/deals/${id}`, { method: "DELETE", credentials: "same-origin" });
    if (!res.ok) {
      setError("Delete failed");
      return;
    }
    await refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Deal management</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Shared deals feed · &quot;Tracker tab&quot; is where each row appears for users (Current vs Archive,
            6-month rule).
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          Add Deal
        </Button>
      </div>

      {error && !modalOpen ? (
        <p className="rounded border border-red-900/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">{error}</p>
      ) : null}

      <Card className="overflow-hidden border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Acquirer</th>
                <th className="px-3 py-2">Target</th>
                <th className="px-3 py-2">Value</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Announced</th>
                <th className="px-3 py-2">Tracker tab</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((d) => {
                const tab = trackerTabLabel(d.announcedAt);
                return (
                  <tr key={d.id} className="border-b border-zinc-800/80">
                    <td className="max-w-[220px] px-3 py-2 align-top text-zinc-200">{d.title}</td>
                    <td className="px-3 py-2 align-top text-zinc-400">{d.acquirer ?? "—"}</td>
                    <td className="px-3 py-2 align-top text-zinc-400">{d.target ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-zinc-400">{d.dealValue ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-zinc-400">{d.dealType}</td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-zinc-500">
                      {new Date(d.announcedAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-xs font-medium",
                          tab === "Current"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-zinc-700/60 text-zinc-400",
                        )}
                      >
                        {tab}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-right">
                      <Button size="sm" variant="outline" className="mr-2 h-7 px-2 text-xs" onClick={() => openEdit(d)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-red-900/50 px-2 text-xs text-red-400 hover:bg-red-950/40"
                        onClick={() => void remove(d.id, d.title)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Edit deal" : "Add deal"}
        className="max-h-[90vh] max-w-2xl overflow-y-auto"
      >
        <div className="grid gap-3 text-sm">
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs text-zinc-500">Title</span>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </label>
            <label>
              <span className="mb-1 block text-xs text-zinc-500">Acquirer</span>
              <Input value={form.acquirer} onChange={(e) => setForm((f) => ({ ...f, acquirer: e.target.value }))} />
            </label>
            <label>
              <span className="mb-1 block text-xs text-zinc-500">Target</span>
              <Input value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))} />
            </label>
            <label>
              <span className="mb-1 block text-xs text-zinc-500">Deal value</span>
              <Input
                placeholder="$36B"
                value={form.dealValue}
                onChange={(e) => setForm((f) => ({ ...f, dealValue: e.target.value }))}
              />
            </label>
            <label>
              <span className="mb-1 block text-xs text-zinc-500">Deal type</span>
              <select
                className="h-9 w-full rounded border border-zinc-700 bg-zinc-950 px-2 text-sm"
                value={form.dealType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dealType: e.target.value as (typeof DEAL_TYPES)[number] }))
                }
              >
                {DEAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs text-zinc-500">Sector</span>
              <Input value={form.sector} onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))} />
            </label>
            <label>
              <span className="mb-1 block text-xs text-zinc-500">Announcement date</span>
              <Input
                type="date"
                value={form.announcedAt}
                onChange={(e) => setForm((f) => ({ ...f, announcedAt: e.target.value }))}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs text-zinc-500">Source URL (optional)</span>
              <Input
                type="url"
                placeholder="https://…"
                value={form.sourceUrl}
                onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs text-zinc-500">Summary</span>
              <textarea
                className="min-h-[88px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm"
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs text-zinc-500">Key thesis</span>
              <textarea
                className="min-h-[72px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm"
                value={form.keyThesis}
                onChange={(e) => setForm((f) => ({ ...f, keyThesis: e.target.value }))}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs text-zinc-500">Risks</span>
              <textarea
                className="min-h-[72px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm"
                value={form.risks}
                onChange={(e) => setForm((f) => ({ ...f, risks: e.target.value }))}
              />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="button" disabled={busy} onClick={() => void save()}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
