"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SearchSelect, type SearchOption } from "@/components/ui/search-select";

const TITLES = ["Analyst", "Associate", "Senior Associate", "Vice President", "Director", "Managing Director", "Partner", "Principal", "Recruiter", "Intern", "Summer Analyst"].map((t) => ({ value: t, label: t }));
const PRIORITIES = [
  { value: "A", label: "A – top target" },
  { value: "B", label: "B – active" },
  { value: "C", label: "C – keep warm" },
];
const NEW = "new:";

/** Quick add (shortcut C): only first name, last name, and firm are required. */
export function NewContactDialog({ open, onClose, onSaved, defaultFirm }: { open: boolean; onClose: () => void; onSaved?: () => void; defaultFirm?: SearchOption | null }) {
  const blank = { first: "", last: "", title: "", email: "", linkedin: "", group: "", priority: "" };
  const [f, setF] = useState(blank);
  const [firm, setFirm] = useState<SearchOption | null>(defaultFirm ?? null);
  const [dup, setDup] = useState<{ id: string; fullName: string; firm: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF(blank);
    setFirm(defaultFirm ?? null);
    setDup(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Duplicate warning: email, LinkedIn URL, or name + firm.
  useEffect(() => {
    const name = `${f.first} ${f.last}`.trim();
    if (!f.email && !f.linkedin && !(f.first && f.last)) return setDup(null);
    const t = window.setTimeout(async () => {
      const qs = new URLSearchParams({ email: f.email, linkedin: f.linkedin, name, firm: firm?.label ?? "" });
      const res = await fetch(`/api/contacts/duplicates?${qs}`);
      if (res.ok) setDup(((await res.json()) as { duplicate: typeof dup }).duplicate);
    }, 350);
    return () => window.clearTimeout(t);
  }, [f.email, f.linkedin, f.first, f.last, firm?.label]);

  const save = async (another: boolean) => {
    if (!f.first.trim() || !f.last.trim()) return toast.error("Add their first and last name.");
    if (!firm) return toast.error("Pick or add their firm.");
    setBusy(true);
    const isNew = firm.value.startsWith(NEW);
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: f.first.trim(),
        lastName: f.last.trim(),
        ...(isNew ? { firmName: firm.label } : { firmId: firm.value }),
        title: f.title,
        email: f.email.trim(),
        linkedinUrl: f.linkedin.trim(),
        group: f.group.trim(),
        priority: f.priority || null,
        source: "manual",
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      return toast.error(d.error ?? "Couldn't save the contact.");
    }
    toast(`Added ${f.first} ${f.last}`);
    onSaved?.();
    if (another) {
      setF(blank);
      setDup(null);
    } else onClose();
  };

  const label = "mb-1 block text-[13px] font-medium text-ink-2";
  return (
    <Modal open={open} onClose={onClose} title="New contact">
      <div className="space-y-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>First name *</label>
            <Input autoFocus value={f.first} onChange={(e) => setF({ ...f, first: e.target.value })} />
          </div>
          <div>
            <label className={label}>Last name *</label>
            <Input value={f.last} onChange={(e) => setF({ ...f, last: e.target.value })} />
          </div>
        </div>
        <div>
          <label className={label}>Firm *</label>
          <SearchSelect
            endpoint="/api/search/firms"
            value={firm?.value ?? ""}
            knownOptions={firm ? [firm] : []}
            recentKey="firms"
            placeholder="Search firms"
            ariaLabel="Firm"
            onChange={(_v, o) => setFirm(o)}
            onCreate={(name) => ({ value: `${NEW}${name}`, label: name, sublabel: "New firm" })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>Title</label>
            <SearchSelect value={f.title} options={TITLES} recentKey="titles" placeholder="e.g. Analyst" ariaLabel="Title" onChange={(v) => setF({ ...f, title: v })} onCreate={(t) => ({ value: t, label: t })} />
          </div>
          <div>
            <label className={label}>Group</label>
            <Input value={f.group} onChange={(e) => setF({ ...f, group: e.target.value })} placeholder="e.g. M&A" />
          </div>
          <div>
            <label className={label}>Email</label>
            <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </div>
          <div>
            <label className={label}>LinkedIn URL</label>
            <Input value={f.linkedin} onChange={(e) => setF({ ...f, linkedin: e.target.value })} />
          </div>
          <div>
            <label className={label}>Priority</label>
            <SearchSelect value={f.priority} options={PRIORITIES} placeholder="Optional" ariaLabel="Priority" onChange={(v) => setF({ ...f, priority: v })} />
          </div>
        </div>
        {dup ? (
          <div className="rounded-[var(--radius)] border border-warn bg-warn-bg px-3 py-2 text-[13px] text-ink">
            Looks like <span className="font-medium">{dup.fullName}</span> at {dup.firm} already exists ·{" "}
            <Link href={`/contacts/${dup.id}`} className="font-medium text-accent hover:underline">
              Open
            </Link>{" "}
            · or save anyway to create a new one.
          </div>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => void save(true)}>
            Save &amp; add another
          </Button>
          <Button variant="primary" disabled={busy} onClick={() => void save(false)}>
            {dup ? "Create anyway" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
