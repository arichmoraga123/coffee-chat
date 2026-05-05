"use client";

import { useMemo, useState } from "react";
import { subMonths, startOfDay } from "date-fns";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { DEAL_TYPE_OPTIONS, VERTICAL_OPTIONS } from "@/lib/deal-taxonomy";

type DealRow = {
  id: string;
  title: string;
  acquirer: string | null;
  target: string | null;
  dealValue: string | null;
  dealType: string;
  vertical: string | null;
  sector: string | null;
  summary: string;
  keyThesis: string | null;
  risks: string | null;
  sourceUrl: string | null;
  announcedAt: string;
  status: string;
};

function trackerTabLabel(announcedAt: string): "Current" | "Archive" {
  const cutoff = startOfDay(subMonths(new Date(), 6));
  return new Date(announcedAt) >= cutoff ? "Current" : "Archive";
}

type DealFormState = {
  title: string;
  acquirer: string;
  target: string;
  dealValue: string;
  dealType: string;
  vertical: string;
  sector: string;
  announcedAt: string;
  sourceUrl: string;
  summary: string;
  keyThesis: string;
  risks: string;
};

function emptyForm(): DealFormState {
  return {
    title: "",
    acquirer: "",
    target: "",
    dealValue: "",
    dealType: DEAL_TYPE_OPTIONS[0],
    vertical: "",
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
  const [listTab, setListTab] = useState<"drafts" | "published">("drafts");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DealFormState>(() => emptyForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...deals].sort((a, b) => new Date(b.announcedAt).getTime() - new Date(a.announcedAt).getTime()),
    [deals],
  );

  const filtered = useMemo(
    () =>
      sorted.filter((d) => (listTab === "drafts" ? d.status === "draft" : d.status === "published")),
    [sorted, listTab],
  );

  const draftCount = useMemo(() => deals.filter((d) => d.status === "draft").length, [deals]);

  const refresh = async () => {
    const res = await fetch("/api/admin/deals", { credentials: "same-origin" });
    if (!res.ok) return;
    const d = (await res.json()) as { deals: DealRow[] };
    setDeals(
      d.deals.map((row) => ({
        ...row,
        announcedAt: typeof row.announcedAt === "string" ? row.announcedAt : String(row.announcedAt),
        status: row.status === "published" ? "published" : "draft",
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
      dealType: (DEAL_TYPE_OPTIONS as readonly string[]).includes(row.dealType)
        ? row.dealType
        : DEAL_TYPE_OPTIONS[0],
      vertical: row.vertical ?? "",
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
      vertical: form.vertical.trim() || null,
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
        const row = deals.find((x) => x.id === editingId);
        const patchBody =
          row?.status === "draft"
            ? { ...payload, status: "draft" as const }
            : { ...payload, status: "published" as const };
        const res = await fetch(`/api/deals/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(patchBody),
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

  const publish = async (id: string) => {
    setBusy(true);
    const res = await fetch(`/api/deals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ status: "published" }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Publish failed");
      return;
    }
    setError(null);
    await refresh();
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
          <h1 className="page-title">Deal management</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Drafts: auto-ingested from news (review before publish). Published: visible on /deals.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          Add Deal
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-2">
        <Button
          type="button"
          size="sm"
          variant={listTab === "drafts" ? "default" : "outline"}
          className={cn(listTab === "drafts" && "bg-amber-600 text-white hover:bg-amber-500")}
          onClick={() => setListTab("drafts")}
        >
          Drafts
          {draftCount > 0 ? (
            <span className="ml-2 rounded-full bg-black/30 px-2 py-0.5 text-xs">{draftCount}</span>
          ) : null}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={listTab === "published" ? "default" : "outline"}
          onClick={() => setListTab("published")}
        >
          Published
        </Button>
      </div>

      {error && !modalOpen ? (
        <p className="rounded border border-red-900/40 bg-red-950/30 px-3 py-2 text-sm text-red-200">{error}</p>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-white/10 bg-zinc-950/90 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="px-3 py-3">Title</th>
                <th className="px-3 py-3">Acquirer</th>
                <th className="px-3 py-3">Target</th>
                <th className="px-3 py-3">Value</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Vertical</th>
                <th className="px-3 py-3">Announced</th>
                <th className="px-3 py-3">Tracker tab</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const tab = trackerTabLabel(d.announcedAt);
                return (
                  <tr
                    key={d.id}
                    className="border-b border-white/[0.06] odd:bg-white/[0.02] transition-colors hover:bg-white/[0.04] hover:shadow-[inset_3px_0_0_0_rgba(201,168,76,0.35)]"
                  >
                    <td className="max-w-[220px] px-3 py-2 align-top text-zinc-200">{d.title}</td>
                    <td className="px-3 py-2 align-top text-zinc-400">{d.acquirer ?? "—"}</td>
                    <td className="px-3 py-2 align-top text-zinc-400">{d.target ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-zinc-400">{d.dealValue ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-zinc-400">{d.dealType}</td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-zinc-400">{d.vertical ?? "—"}</td>
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
                      {listTab === "drafts" ? (
                        <Button
                          size="sm"
                          className="mr-2 h-7 bg-emerald-600 px-2 text-xs hover:bg-emerald-500"
                          disabled={busy}
                          onClick={() => void publish(d.id)}
                        >
                          Publish
                        </Button>
                      ) : null}
                      <Button size="sm" variant="outline" className="mr-2 h-7 px-2 text-xs" onClick={() => openEdit(d)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 px-2 text-xs"
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
        {filtered.length === 0 ? (
          <p className="border-t border-zinc-800 px-3 py-4 text-sm text-zinc-500">
            {listTab === "drafts" ? "No drafts — ingest runs on the news cron." : "No published deals yet."}
          </p>
        ) : null}
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
                onChange={(e) => setForm((f) => ({ ...f, dealType: e.target.value }))}
              >
                {DEAL_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs text-zinc-500">Vertical</span>
              <select
                className="h-9 w-full rounded border border-zinc-700 bg-zinc-950 px-2 text-sm"
                value={form.vertical}
                onChange={(e) => setForm((f) => ({ ...f, vertical: e.target.value }))}
              >
                <option value="">— None —</option>
                {VERTICAL_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
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
