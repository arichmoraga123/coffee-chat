"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SearchSelect } from "@/components/ui/search-select";
import { bulkRequest } from "@/components/ui/bulk";
import { INTERACTION_KINDS, KIND_OPTIONS, type InteractionKind } from "@/lib/followups";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { interactionTypeLabel } from "@/lib/interaction-labels";
import { cn } from "@/lib/utils";

export type TimelineInteraction = {
  id: string;
  date: string;
  type: string;
  notes: string | null;
  adviceGiven: string | null;
  actionItems: string[];
  actionItemsChecked: number[];
  personalDetails: string | null;
  firmInsights: string | null;
  redFlags: string | null;
  kind?: string | null;
  nextStep?: string | null;
  nextStepDue?: string | null;
};

export function ContactInteractionTimeline({
  interactions,
  onDraftFollowUp,
}: {
  interactions: TimelineInteraction[];
  onDraftFollowUp: (interactionId: string) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<TimelineInteraction | null>(null);

  const toggleActionItem = async (interactionId: string, index: number, checked: boolean) => {
    const row = interactions.find((i) => i.id === interactionId);
    if (!row) return;
    const set = new Set(row.actionItemsChecked);
    if (checked) set.add(index);
    else set.delete(index);
    const next = [...set].sort((a, b) => a - b);
    await fetch(`/api/interactions/${interactionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionItemsChecked: next }),
    });
    router.refresh();
  };

  if (interactions.length === 0) {
    return (
      <Card className="border-border bg-surface p-6 text-center text-sm text-ink-3">
        No interactions logged yet. Use &quot;Log interaction&quot; to add one.
      </Card>
    );
  }

  return (
    <div className="relative pl-4">
      <EditInteractionDialog interaction={editing} onClose={() => setEditing(null)} onSaved={() => router.refresh()} />
      <div className="absolute bottom-0 left-[7px] top-2 w-px bg-border-strong" aria-hidden />
      <ul className="space-y-6">
        {interactions.map((i) => (
          <li key={i.id} className="relative">
            <span
              className="absolute left-[-9px] top-1.5 h-3 w-3 rounded-full border-2 border-accent bg-bg"
              aria-hidden
            />
            <Card className="border-border bg-surface p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-2">
                <div>
                  <p className="font-medium text-ink">
                    {new Date(i.date).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <span className="mt-1 inline-block rounded bg-accent-tint px-2 py-0.5 text-xs font-semibold text-accent">
                    {i.kind && i.kind in INTERACTION_KINDS ? INTERACTION_KINDS[i.kind as InteractionKind].label : interactionTypeLabel(i.type)}
                  </span>
                </div>
                <span className="flex shrink-0 flex-wrap gap-1">
                  <Button type="button" variant="secondary" size="sm" onClick={() => onDraftFollowUp(i.id)}>
                    Draft follow-up
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(i)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void bulkRequest({ entity: "interactions", ids: [i.id], op: "action", action: "delete" }, { success: () => "Interaction deleted", onChange: () => router.refresh() })}
                  >
                    Delete
                  </Button>
                </span>
              </div>

              <div className="mt-3 space-y-3 text-ink-2">
                {i.notes ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">Discussed</p>
                    <p className="whitespace-pre-wrap text-ink">{i.notes}</p>
                  </div>
                ) : null}
                {i.adviceGiven ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">Advice given</p>
                    <p className="whitespace-pre-wrap text-warn">{i.adviceGiven}</p>
                  </div>
                ) : null}
                {i.actionItems.length > 0 ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">Action items</p>
                    <ul className="mt-1 space-y-1.5">
                      {i.actionItems.map((item, idx) => {
                        const checked = i.actionItemsChecked.includes(idx);
                        return (
                          <li key={idx} className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                void toggleActionItem(i.id, idx, e.target.checked)
                              }
                              className="mt-1 h-3.5 w-3.5 shrink-0 rounded border-border-strong"
                            />
                            <span className={cn(checked && "text-ink-3 line-through")}>{item}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
                {i.personalDetails ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">
                      Personal details
                    </p>
                    <p className="whitespace-pre-wrap text-ink">{i.personalDetails}</p>
                  </div>
                ) : null}
                {i.firmInsights ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">Firm insights</p>
                    <p className="whitespace-pre-wrap text-ink">{i.firmInsights}</p>
                  </div>
                ) : null}
                {i.nextStep ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">Next step</p>
                    <p className="text-ink">
                      {i.nextStep}
                      {i.nextStepDue ? <span className="text-ink-3"> · due {new Date(i.nextStepDue).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</span> : null}
                    </p>
                  </div>
                ) : null}
                {i.redFlags ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-danger">Red flags</p>
                    <p className="whitespace-pre-wrap text-danger">{i.redFlags}</p>
                  </div>
                ) : null}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EditInteractionDialog({ interaction, onClose, onSaved }: { interaction: TimelineInteraction | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ kind: "", date: "", notes: "", adviceGiven: "", personalDetails: "", nextStep: "", nextStepDue: "" });
  useEffect(() => {
    if (!interaction) return;
    setF({
      kind: interaction.kind ?? "",
      date: interaction.date.slice(0, 10),
      notes: interaction.notes ?? "",
      adviceGiven: interaction.adviceGiven ?? "",
      personalDetails: interaction.personalDetails ?? "",
      nextStep: interaction.nextStep ?? "",
      nextStepDue: interaction.nextStepDue?.slice(0, 10) ?? "",
    });
  }, [interaction]);
  const save = async () => {
    if (!interaction) return;
    const res = await fetch(`/api/interactions/${interaction.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, kind: f.kind || undefined, nextStepDue: f.nextStepDue || null }),
    });
    if (!res.ok) return toast.error("Couldn't save.");
    toast("Saved");
    onSaved();
    onClose();
  };
  const label = "mb-1 block text-[13px] font-medium text-ink-2";
  return (
    <Modal open={Boolean(interaction)} onClose={onClose} title="Edit interaction">
      <div className="space-y-3 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>Type</label>
            <SearchSelect value={f.kind} options={KIND_OPTIONS} ariaLabel="Type" onChange={(v) => setF({ ...f, kind: v })} />
          </div>
          <div>
            <label className={label}>Date</label>
            <Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </div>
        </div>
        <div>
          <label className={label}>Summary</label>
          <Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="min-h-20" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>Advice they gave</label>
            <Textarea value={f.adviceGiven} onChange={(e) => setF({ ...f, adviceGiven: e.target.value })} className="min-h-16" />
          </div>
          <div>
            <label className={label}>Personal details</label>
            <Textarea value={f.personalDetails} onChange={(e) => setF({ ...f, personalDetails: e.target.value })} className="min-h-16" />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
          <div>
            <label className={label}>Next step</label>
            <Input value={f.nextStep} onChange={(e) => setF({ ...f, nextStep: e.target.value })} />
          </div>
          <div>
            <label className={label}>Due</label>
            <Input type="date" value={f.nextStepDue} onChange={(e) => setF({ ...f, nextStepDue: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void save()}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
