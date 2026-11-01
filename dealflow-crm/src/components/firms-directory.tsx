"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { FIRM_TYPE_ORDER, FIRM_TYPE_LABELS, FirmTypeBadge } from "@/lib/firm-type";
import type { FirmType } from "@prisma/client";
import { Select } from "@/components/ui/select";
import { PageHeader } from "@/components/ui/page-header";
import { BulkActionBar, InlineEdit, SelectCheckbox, downloadCsv, useBulkSelection } from "@/components/ui/bulk";
import { rank } from "@/lib/fuzzy";
import { cn } from "@/lib/utils";

export type FirmRow = {
  id: string;
  name: string;
  type: FirmType | null;
  location: string;
  contacts: number;
  opportunities: number;
};

export function FirmsDirectory({ initialFirms }: { initialFirms: FirmRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<FirmType | "">("");
  const [location, setLocation] = useState("");
  const [focus, setFocus] = useState("Generalist");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createFirm = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/firms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        type: type || undefined,
        location: location.trim() || "Unknown",
        focus: focus.trim() || "Generalist",
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      setError(d.error ?? "Could not create firm");
      return;
    }
    setOpen(false);
    setName("");
    setType("");
    setLocation("");
    setFocus("Generalist");
    router.refresh();
  };

  const [q, setQ] = useState("");
  const shown = useMemo(() => (q.trim() ? rank(initialFirms, q, (f) => f.name, (f) => `${f.location} ${f.type ?? ""}`) : initialFirms), [initialFirms, q]);
  const sel = useBulkSelection(shown.map((f) => f.id));
  const typeOptions = FIRM_TYPE_ORDER.map((t) => ({ value: t, label: FIRM_TYPE_LABELS[t] }));
  const selectedFirms = initialFirms.filter((f) => sel.has(f.id));
  const refresh = () => router.refresh();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Firms"
        subtitle="Every firm you're tracking. Merge duplicates so contacts and opportunities stay together."
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setType("");
              setOpen(true);
            }}
          >
            Add firm
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search firms" aria-label="Search firms" className="w-full sm:w-72" />
        <span className="text-[13px] text-ink-3">
          {shown.length} of {initialFirms.length}
        </span>
      </div>
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-surface">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-semibold uppercase tracking-[0.06em] text-ink-3">
              <th className="w-10 px-3 py-2.5">
                <SelectCheckbox checked={sel.pageAllSelected} onToggle={() => sel.togglePage()} label="Select all firms" />
              </th>
              <th className="px-3 py-2.5">Firm</th>
              <th className="px-3 py-2.5">Type</th>
              <th className="px-3 py-2.5">Location</th>
              <th className="px-3 py-2.5 text-right">Contacts</th>
              <th className="px-3 py-2.5 text-right">Opportunities</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-0">
                  <EmptyState className="border-0" title={initialFirms.length ? `No firms match “${q}”.` : "No firms yet. Add one, or they'll appear as you add contacts."} />
                </td>
              </tr>
            ) : null}
            {shown.map((f) => (
              <tr key={f.id} className={cn("border-b border-divider", sel.has(f.id) && "bg-accent-tint/60")}>
                <td className="px-3 py-2.5">
                  <SelectCheckbox checked={sel.has(f.id)} onToggle={(e) => sel.toggle(f.id, e)} label={`Select ${f.name}`} />
                </td>
                <td className="px-3 py-2.5">
                  <Link href={`/firms/${f.id}`} className="font-medium text-ink hover:underline">
                    {f.name}
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <InlineEdit entity="firms" id={f.id} field="type" type="select" options={typeOptions} value={f.type ?? ""} display={<FirmTypeBadge type={f.type} />} ariaLabel={`type for ${f.name}`} onSaved={refresh} />
                </td>
                <td className="px-3 py-2.5 text-ink-2">
                  <InlineEdit entity="firms" id={f.id} field="location" value={f.location} ariaLabel={`location for ${f.name}`} onSaved={refresh} />
                </td>
                <td className="px-3 py-2.5 text-right text-ink-2">{f.contacts}</td>
                <td className="px-3 py-2.5 text-right text-ink-2">{f.opportunities}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <BulkActionBar
        entity="firms"
        noun={["firm", "firms"]}
        sel={sel}
        fields={[
          { key: "type", label: "Type", type: "select", options: typeOptions },
          { key: "location", label: "Location", type: "text" },
        ]}
        actions={[
          ...(sel.count >= 2
            ? [{ key: "merge", label: "Merge firms", undoable: false, prompt: { label: "Keep which firm? Contacts and opportunities from the others move to it.", type: "select" as const, options: selectedFirms.map((f) => ({ value: f.id, label: f.name, sublabel: `${f.contacts} contacts · ${f.opportunities} opportunities` })) } }]
            : []),
          { key: "export", label: "Export CSV", client: (ids) => downloadCsv("firms.csv", ["Firm", "Type", "Location", "Contacts", "Opportunities"], initialFirms.filter((f) => ids.includes(f.id)).map((f) => [f.name, f.type, f.location, f.contacts, f.opportunities])) },
          { key: "delete", label: "Delete", danger: true },
        ]}
        onChange={refresh}
      />
      <Modal open={open} onClose={() => setOpen(false)} title="New firm" className="max-w-md">
        <div className="space-y-2 text-sm">
          <Input placeholder="Firm name" value={name} onChange={(e) => setName(e.target.value)} />
          <label className="mb-1 block text-xs text-ink-3">Firm type</label>
          <Select
            className="w-full"
            value={type}
            onChange={(e) => setType((e.target.value || "") as FirmType | "")}
          >
            <option value="">Select firm type…</option>
            {FIRM_TYPE_ORDER.map((t) => (
              <option key={t} value={t}>
                {FIRM_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
          <Input placeholder="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
          <Input placeholder="Focus" value={focus} onChange={(e) => setFocus(e.target.value)} />
          {error ? <p className="text-xs text-danger">{error}</p> : null}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" disabled={busy || !name.trim() || !type} onClick={() => void createFirm()}>
            {busy ? "Saving…" : "Create"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
