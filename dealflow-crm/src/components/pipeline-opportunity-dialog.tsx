"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SearchSelect, type SearchOption } from "@/components/ui/search-select";
import { OPPORTUNITY_ROLE_VALUES, PIPELINE_STAGES, STAGE_LABELS } from "@/lib/constants";
import { FIRM_TYPE_ORDER, FIRM_TYPE_LABELS } from "@/lib/firm-type";
import type { FirmType } from "@prisma/client";

export type PipelineOppFormRow = {
  id: string;
  stage: (typeof PIPELINE_STAGES)[number];
  role: string;
  firmId: string;
  firmName: string;
  firmType: FirmType | null;
  applicationDeadline: string | null;
  contactName: string;
  notes: string;
  group?: string | null;
  location?: string | null;
  contacts?: { id: string; name: string }[];
};

type FirmOption = { id: string; name: string };

const NEW_PREFIX = "new:";
const ROLE_LABEL: Record<string, string> = { "Summer Analyst": "SA — Summer Analyst", "Full-Time Analyst": "FT — Full-Time Analyst" };
const COMMON_GROUPS = ["M&A", "Leveraged Finance", "Restructuring", "ECM", "DCM", "TMT", "Healthcare", "Industrials", "FIG", "Consumer & Retail", "Energy & Power", "Real Estate", "Sponsors / FSG", "Generalist"];
const COMMON_LOCATIONS = ["New York", "Chicago", "San Francisco", "Los Angeles", "Houston", "Dallas", "Boston", "Charlotte", "Detroit", "Atlanta", "Menlo Park", "Washington, DC", "London"];

type Props = {
  open: boolean;
  onClose: () => void;
  firms: FirmOption[];
  editing: PipelineOppFormRow | null;
  customRoles?: string[];
  groups?: string[];
  locations?: string[];
};

const uniq = (xs: string[]) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))];

export function PipelineOpportunityDialog({ open, onClose, firms, editing, customRoles = [], groups = [], locations = [] }: Props) {
  const router = useRouter();
  const [firm, setFirm] = useState<SearchOption | null>(null);
  const [newFirmType, setNewFirmType] = useState<FirmType | "">("");
  const [role, setRole] = useState<string>(OPPORTUNITY_ROLE_VALUES[0]);
  const [extraRoles, setExtraRoles] = useState<string[]>([]);
  const [group, setGroup] = useState("");
  const [location, setLocation] = useState("");
  const [deadline, setDeadline] = useState("");
  const [contacts, setContacts] = useState<SearchOption[]>([]);
  const [notes, setNotes] = useState("");
  const [stage, setStage] = useState<(typeof PIPELINE_STAGES)[number]>("TARGET");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setNewFirmType("");
    if (editing) {
      setFirm({ value: editing.firmId, label: editing.firmName });
      setRole(editing.role);
      setGroup(editing.group ?? "");
      setLocation(editing.location ?? "");
      setDeadline(editing.applicationDeadline ?? "");
      setContacts((editing.contacts ?? []).map((c) => ({ value: c.id, label: c.name })));
      setNotes(editing.notes);
      setStage(editing.stage);
    } else {
      setFirm(null);
      setRole(OPPORTUNITY_ROLE_VALUES[0]);
      setGroup("");
      setLocation("");
      setDeadline("");
      setContacts([]);
      setNotes("");
      setStage("TARGET");
    }
  }, [open, editing]);

  const isNewFirm = Boolean(firm?.value.startsWith(NEW_PREFIX));
  const roleOptions = useMemo(
    () => uniq([...OPPORTUNITY_ROLE_VALUES, ...customRoles, ...extraRoles, role]).map((r) => ({ value: r, label: ROLE_LABEL[r] ?? r })),
    [customRoles, extraRoles, role],
  );
  const groupOptions = useMemo(() => uniq([...groups, ...COMMON_GROUPS, group]).map((g) => ({ value: g, label: g })), [groups, group]);
  const locationOptions = useMemo(() => uniq([...locations, ...COMMON_LOCATIONS, location]).map((l) => ({ value: l, label: l })), [locations, location]);
  const firmKnown = useMemo(() => firms.map((f) => ({ value: f.id, label: f.name })), [firms]);

  // "Add new contact": creates the contact at the chosen firm and links it.
  const createContact = async (name: string): Promise<SearchOption | null> => {
    if (!firm || isNewFirm) {
      toast.error("Pick or create the firm first, then add the contact.");
      return null;
    }
    const res = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName: name, firmId: firm.value, source: "manual" }),
    });
    if (!res.ok) {
      toast.error("Couldn't add that contact.");
      return null;
    }
    const c = (await res.json()) as { id: string; fullName: string };
    toast(`Added ${c.fullName} at ${firm.label}`);
    return { value: c.id, label: c.fullName, sublabel: firm.label };
  };

  const submit = async () => {
    setError(null);
    if (!firm) return setError("Pick a firm, or type a new one.");
    if (isNewFirm && !newFirmType) return setError("Pick a firm type for the new firm.");
    if (!role.trim()) return setError("Pick a role.");
    setBusy(true);
    const payload: Record<string, unknown> = {
      role,
      notes,
      stage,
      group,
      location,
      contactIds: contacts.map((c) => c.value),
      contactName: contacts.map((c) => c.label).join(", "),
      applicationDeadline: deadline.trim() ? deadline : null,
      ...(isNewFirm ? { firmName: firm.label, firmType: newFirmType } : { firmId: firm.value }),
    };
    try {
      const res = await fetch(editing ? `/api/opportunities/${editing.id}` : "/api/opportunities", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Could not save");
        return;
      }
      onClose();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const label = "mb-1 block text-[13px] font-medium text-ink-2";

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit opportunity" : "Add opportunity"} className="max-w-lg">
      <div className="space-y-3 text-sm">
        <div>
          <label className={label}>Firm</label>
          <SearchSelect
            endpoint="/api/search/firms"
            knownOptions={firmKnown}
            value={firm?.value ?? ""}
            recentKey="firms"
            placeholder="Search firms"
            ariaLabel="Firm"
            onChange={(_v, o) => setFirm(o)}
            onCreate={(name) => ({ value: `${NEW_PREFIX}${name}`, label: name, sublabel: "New firm" })}
          />
          {isNewFirm ? (
            <div className="mt-2">
              <label className={label}>Firm type for {firm?.label}</label>
              <SearchSelect
                value={newFirmType}
                options={FIRM_TYPE_ORDER.map((t) => ({ value: t, label: FIRM_TYPE_LABELS[t] }))}
                placeholder="Pick a firm type"
                ariaLabel="Firm type"
                onChange={(v) => setNewFirmType(v as FirmType)}
              />
            </div>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>Role</label>
            <SearchSelect
              value={role}
              options={roleOptions}
              recentKey="opp-roles"
              ariaLabel="Role"
              onChange={(v) => setRole(v)}
              onCreate={(r) => {
                setExtraRoles((x) => [...x, r]);
                return { value: r, label: r };
              }}
            />
          </div>
          <div>
            <label className={label}>Stage</label>
            <SearchSelect
              value={stage}
              options={PIPELINE_STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] }))}
              ariaLabel="Stage"
              onChange={(v) => setStage(v as (typeof PIPELINE_STAGES)[number])}
            />
          </div>
          <div>
            <label className={label}>Group</label>
            <SearchSelect value={group} options={groupOptions} recentKey="opp-groups" placeholder="e.g. TMT" ariaLabel="Group" onChange={(v) => setGroup(v)} onCreate={(g) => ({ value: g, label: g })} />
          </div>
          <div>
            <label className={label}>Location</label>
            <SearchSelect value={location} options={locationOptions} recentKey="opp-locations" placeholder="e.g. New York" ariaLabel="Location" onChange={(v) => setLocation(v)} onCreate={(l) => ({ value: l, label: l })} />
          </div>
        </div>
        <div>
          <label className={label}>Contacts</label>
          <SearchSelect
            multiple
            endpoint={`/api/search/contacts${firm && !isNewFirm ? `?firmId=${encodeURIComponent(firm.value)}` : ""}`}
            knownOptions={contacts}
            value={contacts.map((c) => c.value)}
            placeholder={firm ? `People at ${firm.label} first` : "Search contacts"}
            ariaLabel="Contacts"
            onChange={(_v, opts) => setContacts(opts)}
            onCreate={createContact}
            createLabel={(q) => `Add new contact “${q}”${firm && !isNewFirm ? ` at ${firm.label}` : ""}`}
          />
        </div>
        <div>
          <label className={label}>Application deadline</label>
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <div>
          <label className={label}>Notes (optional)</label>
          <textarea
            className="min-h-[72px] w-full rounded-[var(--radius)] border border-border-strong bg-surface p-2 text-ink"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {error && <p className="text-[13px] text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={() => void submit()} disabled={busy}>
            {busy ? "Saving…" : editing ? "Save" : "Add"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
