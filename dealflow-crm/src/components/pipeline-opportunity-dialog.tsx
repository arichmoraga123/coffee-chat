"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import {
  OPPORTUNITY_ROLE_VALUES,
  PIPELINE_STAGES,
  STAGE_LABELS,
} from "@/lib/constants";
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
};

type FirmOption = { id: string; name: string };

const NEW_FIRM = "__new__";

type Props = {
  open: boolean;
  onClose: () => void;
  firms: FirmOption[];
  editing: PipelineOppFormRow | null;
};

export function PipelineOpportunityDialog({ open, onClose, firms, editing }: Props) {
  const router = useRouter();
  const [firmChoice, setFirmChoice] = useState("");
  const [newFirmName, setNewFirmName] = useState("");
  const [newFirmType, setNewFirmType] = useState<FirmType | "">("");
  const [role, setRole] = useState<string>(OPPORTUNITY_ROLE_VALUES[0]);
  const [deadline, setDeadline] = useState("");
  const [contactName, setContactName] = useState("");
  const [notes, setNotes] = useState("");
  const [stage, setStage] = useState<(typeof PIPELINE_STAGES)[number]>("TARGET");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editing) {
      setFirmChoice(editing.firmId);
      setNewFirmName("");
      setNewFirmType("");
      setRole(editing.role);
      setDeadline(editing.applicationDeadline ?? "");
      setContactName(editing.contactName);
      setNotes(editing.notes);
      setStage(editing.stage);
    } else {
      setFirmChoice(firms[0]?.id ?? NEW_FIRM);
      setNewFirmName("");
      setNewFirmType("");
      setRole(OPPORTUNITY_ROLE_VALUES[0]);
      setDeadline("");
      setContactName("");
      setNotes("");
      setStage("TARGET");
    }
  }, [open, editing, firms]);

  const usingNewFirm = firmChoice === NEW_FIRM;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        const payload: Record<string, unknown> = {
          role,
          notes,
          contactName,
          stage,
          applicationDeadline: deadline.trim() ? deadline : null,
        };
        if (usingNewFirm) {
          const name = newFirmName.trim();
          if (!name) {
            setError("Enter a firm name or pick an existing firm.");
            setBusy(false);
            return;
          }
          if (!newFirmType) {
            setError("Select a firm type for the new firm.");
            setBusy(false);
            return;
          }
          payload.firmName = name;
          payload.firmType = newFirmType;
        } else {
          payload.firmId = firmChoice;
        }
        const res = await fetch(`/api/opportunities/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? "Could not save");
          setBusy(false);
          return;
        }
      } else {
        const payload: Record<string, unknown> = {
          role,
          notes,
          contactName,
          stage,
          applicationDeadline: deadline.trim() ? deadline : null,
        };
        if (usingNewFirm) {
          const name = newFirmName.trim();
          if (!name) {
            setError("Enter a firm name or pick an existing firm.");
            setBusy(false);
            return;
          }
          if (!newFirmType) {
            setError("Select a firm type for the new firm.");
            setBusy(false);
            return;
          }
          payload.firmName = name;
          payload.firmType = newFirmType;
        } else {
          if (!firmChoice) {
            setError("Pick a firm or create a new one.");
            setBusy(false);
            return;
          }
          payload.firmId = firmChoice;
        }
        const res = await fetch("/api/opportunities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          setError(data.error ?? "Could not create");
          setBusy(false);
          return;
        }
      }
      onClose();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit opportunity" : "Add opportunity"}
      className="max-w-lg"
    >
      <div className="space-y-3 text-sm">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Firm</label>
          <select
            className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-zinc-100"
            value={usingNewFirm ? NEW_FIRM : firmChoice}
            onChange={(e) => setFirmChoice(e.target.value)}
          >
            {firms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
            <option value={NEW_FIRM}>New firm…</option>
          </select>
          {usingNewFirm && (
            <>
              <Input
                className="mt-2"
                placeholder="Firm name"
                value={newFirmName}
                onChange={(e) => setNewFirmName(e.target.value)}
              />
              <label className="mt-2 block text-xs text-zinc-500">Firm type</label>
              <select
                className="mt-1 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-zinc-100"
                value={newFirmType}
                onChange={(e) => setNewFirmType((e.target.value || "") as FirmType | "")}
              >
                <option value="">Select firm type…</option>
                {FIRM_TYPE_ORDER.map((t) => (
                  <option key={t} value={t}>
                    {FIRM_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Role</label>
          <select
            className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-zinc-100"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {OPPORTUNITY_ROLE_VALUES.map((r) => (
              <option key={r} value={r}>
                {r === "Summer Analyst"
                  ? "SA — Summer Analyst"
                  : r === "Full-Time Analyst"
                    ? "FT — Full-Time Analyst"
                    : "Other"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Application deadline</label>
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Contact name (optional)</label>
          <Input
            placeholder="e.g. recruiter you spoke with"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Notes (optional)</label>
          <textarea
            className="min-h-[72px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-zinc-100"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Stage</label>
          <select
            className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-zinc-100"
            value={stage}
            onChange={(e) => setStage(e.target.value as (typeof PIPELINE_STAGES)[number])}
          >
            {PIPELINE_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={() => void submit()} disabled={busy}>
            {busy ? "Saving…" : editing ? "Save" : "Add"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
