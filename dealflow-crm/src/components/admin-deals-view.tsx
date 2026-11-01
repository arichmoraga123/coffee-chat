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
import { Select } from "@/components/ui/select";

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

  const [ingesting, setIngesting] = useState(false);
  const ingestNow = async () => {
    setIngesting(true);
    try {
      const res = await fetch("/api/admin/deals/ingest", { method: "POST", credentials: "same-origin" });
      const d = (await res.json()) as { dealsInserted?: number; error?: string };
      if (!res.ok || d.error) alert(d.error ?? "Ingest failed");
      else alert(`Published ${d.dealsInserted ?? 0} new deal(s) from the news.`);
      await refresh();
    } finally {
      setIngesting(false);
    }
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
          <p className="mt-1 text-sm text-ink-3">
            News is scanned daily: real transactions with a disclosed dollar value are published to /deals automatically.
            Drafts are older or manual entries awaiting review.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={ingesting} onClick={() => void ingestNow()}>
            {ingesting ? "Pulling news…" : "Pull latest deals now"}
          </Button>
          <Button variant="primary" size="sm" onClick={openCreate}>
            Add Deal
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        <Button
          type="button"
          size="sm"
          variant={listTab === "drafts" ? "default" : "outline"}
          className={cn(listTab === "drafts" && "bg-warn text-white hover:bg-warn")}
          onClick={() => setListTab("drafts")}
        >
          Drafts
          {draftCount > 0 ? (
            <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs">{draftCount}</span>
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
        <p className="rounded border border-danger/40 bg-danger-bg px-3 py-2 text-sm text-danger">{error}</p>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-border bg-surface text-left text-[10px] font-semibold uppercase tracking-wider text-ink-3">
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
                    className="border-b border-border odd:bg-surface-2 transition-colors hover:bg-surface-2 "
                  >
                    <td className="max-w-[220px] px-3 py-2 align-top text-ink">{d.title}</td>
                    <td className="px-3 py-2 align-top text-ink-2">{d.acquirer ?? "—"}</td>
                    <td className="px-3 py-2 align-top text-ink-2">{d.target ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-ink-2">{d.dealValue ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-ink-2">{d.dealType}</td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-ink-2">{d.vertical ?? "—"}</td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-ink-3">
                      {new Date(d.announcedAt).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-xs font-medium",
                          tab === "Current"
                            ? "bg-success-bg text-success"
                            : "bg-border-strong text-ink-2",
                        )}
                      >
                        {tab}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-right">
                      {listTab === "drafts" ? (
                        <Button
                          size="sm"
                          className="mr-2 h-7 bg-success px-2 text-xs hover:bg-success"
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
          <p className="border-t border-border px-3 py-4 text-sm text-ink-3">
            {listTab === "drafts" ? "No drafts — real transactions with dollar values are published automatically." : "No published deals yet."}
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
          {error ? <p className="text-xs text-danger">{error}</p> : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs text-ink-3">Title</span>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </label>
            <label>
              <span className="mb-1 block text-xs text-ink-3">Acquirer</span>
              <Input value={form.acquirer} onChange={(e) => setForm((f) => ({ ...f, acquirer: e.target.value }))} />
            </label>
            <label>
              <span className="mb-1 block text-xs text-ink-3">Target</span>
              <Input value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))} />
            </label>
            <label>
              <span className="mb-1 block text-xs text-ink-3">Deal value</span>
              <Input
                placeholder="$36B"
                value={form.dealValue}
                onChange={(e) => setForm((f) => ({ ...f, dealValue: e.target.value }))}
              />
            </label>
            <label>
              <span className="mb-1 block text-xs text-ink-3">Deal type</span>
              <Select
                className="w-full"
                value={form.dealType}
                onChange={(e) => setForm((f) => ({ ...f, dealType: e.target.value }))}
              >
                {DEAL_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </label>
            <label>
              <span className="mb-1 block text-xs text-ink-3">Vertical</span>
              <Select
                className="w-full"
                value={form.vertical}
                onChange={(e) => setForm((f) => ({ ...f, vertical: e.target.value }))}
              >
                <option value="">— None —</option>
                {VERTICAL_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </Select>
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs text-ink-3">Sector</span>
              <Input value={form.sector} onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))} />
            </label>
            <label>
              <span className="mb-1 block text-xs text-ink-3">Announcement date</span>
              <Input
                type="date"
                value={form.announcedAt}
                onChange={(e) => setForm((f) => ({ ...f, announcedAt: e.target.value }))}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs text-ink-3">Source URL (optional)</span>
              <Input
                type="url"
                placeholder="https://…"
                value={form.sourceUrl}
                onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs text-ink-3">Summary</span>
              <textarea
                className="min-h-[88px] w-full rounded border border-border-strong bg-surface p-2 text-sm"
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs text-ink-3">Key thesis</span>
              <textarea
                className="min-h-[72px] w-full rounded border border-border-strong bg-surface p-2 text-sm"
                value={form.keyThesis}
                onChange={(e) => setForm((f) => ({ ...f, keyThesis: e.target.value }))}
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1 block text-xs text-ink-3">Risks</span>
              <textarea
                className="min-h-[72px] w-full rounded border border-border-strong bg-surface p-2 text-sm"
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
