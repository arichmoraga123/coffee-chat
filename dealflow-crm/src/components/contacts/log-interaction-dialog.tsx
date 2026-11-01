"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { SearchSelect, type SearchOption } from "@/components/ui/search-select";
import { KIND_OPTIONS, type InteractionKind } from "@/lib/followups";

const today = () => new Date().toISOString().slice(0, 10);

/** Quick interaction log. Saving it also closes the related follow-up task and opens the next one. */
export function LogInteractionDialog({
  open,
  onClose,
  contact,
  defaultKind = "coffee_chat",
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  /** Preselected contact; when null the dialog asks for one. */
  contact: SearchOption | null;
  defaultKind?: InteractionKind;
  onSaved?: () => void;
}) {
  const [who, setWho] = useState<SearchOption | null>(contact);
  const [kind, setKind] = useState<InteractionKind>(defaultKind);
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [advice, setAdvice] = useState("");
  const [personal, setPersonal] = useState("");
  const [nextStep, setNextStep] = useState("");
  const [nextStepDue, setNextStepDue] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setWho(contact);
    setKind(defaultKind);
    setDate(today());
    setNotes("");
    setAdvice("");
    setPersonal("");
    setNextStep("");
    setNextStepDue("");
  }, [open, contact, defaultKind]);

  const save = async () => {
    if (!who) return toast.error("Pick who you talked to.");
    if (!date) return toast.error("Add the date.");
    setBusy(true);
    const res = await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: who.value, kind, date, notes, adviceGiven: advice, personalDetails: personal, nextStep, nextStepDue: nextStepDue || null }),
    });
    setBusy(false);
    if (!res.ok) return toast.error("Couldn't save that.");
    toast(`Logged for ${who.label}`);
    onSaved?.();
    onClose();
  };

  const label = "mb-1 block text-[13px] font-medium text-ink-2";
  const conversation = ["coffee_chat", "phone_call", "video_call", "in_person", "interview", "event"].includes(kind);

  return (
    <Modal open={open} onClose={onClose} title="Log interaction">
      <div className="space-y-3 text-sm">
        {!contact ? (
          <div>
            <label className={label}>Contact</label>
            <SearchSelect endpoint="/api/search/contacts" value={who?.value ?? ""} knownOptions={who ? [who] : []} onChange={(_v, o) => setWho(o)} placeholder="Search contacts" ariaLabel="Contact" />
          </div>
        ) : (
          <p className="text-ink-2">
            With <span className="font-medium text-ink">{contact.label}</span>
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>Type</label>
            <SearchSelect value={kind} options={KIND_OPTIONS} recentKey="interaction-kinds" ariaLabel="Type" onChange={(v) => setKind(v as InteractionKind)} />
          </div>
          <div>
            <label className={label}>Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className={label}>{conversation ? "What you talked about" : "Summary"}</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20" placeholder={conversation ? "Their path, the group, anything specific" : "Optional"} />
        </div>
        {conversation ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Advice they gave</label>
              <Textarea value={advice} onChange={(e) => setAdvice(e.target.value)} className="min-h-16" />
            </div>
            <div>
              <label className={label}>Personal details</label>
              <Textarea value={personal} onChange={(e) => setPersonal(e.target.value)} className="min-h-16" placeholder="Hometown, hobbies…" />
            </div>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
          <div>
            <label className={label}>Next step</label>
            <Input value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder="e.g. Send update after the info session" />
          </div>
          <div>
            <label className={label}>Due</label>
            <Input type="date" value={nextStepDue} onChange={(e) => setNextStepDue(e.target.value)} />
          </div>
        </div>
        <p className="text-[13px] text-ink-3">Leave the due date empty and Prospect sets the next reminder for you.</p>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={busy} onClick={() => void save()}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
