"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AiOutputModal } from "@/components/ai-output-modal";

type ContactInfo = {
  id: string;
  fullName: string;
  firmName: string;
  title: string;
};

type Props = {
  contacts: ContactInfo[];
  open: boolean;
  onClose: () => void;
};

export function BulkEmailDraftModal({ contacts, open, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [aiModal, setAiModal] = useState({
    open: false,
    title: "",
    text: "",
    loading: false,
    error: null as string | null,
  });

  const current = contacts[index];

  const draftCurrent = async () => {
    if (!current) return;
    setAiModal({
      open: true,
      title: `Cold Outreach — ${current.fullName}`,
      text: "",
      loading: true,
      error: null,
    });
    try {
      const res = await fetch(`/api/contacts/${current.id}/draft-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateType: "cold-outreach" }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) {
        setAiModal((m) => ({ ...m, loading: false, error: data.error ?? "Failed" }));
        return;
      }
      setAiModal((m) => ({ ...m, loading: false, text: data.text ?? "" }));
    } catch {
      setAiModal((m) => ({ ...m, loading: false, error: "Network error" }));
    }
  };

  const handleNext = () => {
    setAiModal((m) => ({ ...m, open: false }));
    if (index + 1 >= contacts.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const handleClose = () => {
    setIndex(0);
    setDone(false);
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <Modal
        open={open && !aiModal.open && !done}
        onClose={handleClose}
        title="Bulk Email Draft"
        className="max-w-md"
      >
        {current ? (
          <div className="space-y-3 text-sm">
            <p className="text-zinc-400">
              {index + 1} of {contacts.length} contacts
            </p>
            <p className="font-medium text-zinc-200">
              {current.fullName} — {current.title} at {current.firmName}
            </p>
            <Button size="sm" onClick={() => void draftCurrent()}>
              Generate cold outreach email
            </Button>
          </div>
        ) : null}
      </Modal>

      <AiOutputModal
        open={aiModal.open}
        title={aiModal.title}
        text={aiModal.text}
        loading={aiModal.loading}
        error={aiModal.error}
        onClose={handleNext}
      />

      <Modal open={done} onClose={handleClose} title="Done" className="max-w-sm">
        <p className="text-sm text-zinc-300">
          Done — emails drafted for {contacts.length} contact{contacts.length !== 1 ? "s" : ""}.
        </p>
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={handleClose}>
            Close
          </Button>
        </div>
      </Modal>
    </>
  );
}

export function BulkOutreachBar({
  count,
  onDraftEmails,
  onExport,
  onAddToQueue,
  onCancel,
}: {
  count: number;
  onDraftEmails: () => void;
  onExport: () => void;
  onAddToQueue: () => void;
  onCancel: () => void;
}) {
  if (count < 2) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-wrap items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 shadow-xl">
      <span className="text-sm text-zinc-300">{count} contacts selected</span>
      <Button size="sm" onClick={onDraftEmails}>
        Draft Emails
      </Button>
      <Button size="sm" variant="outline" onClick={onExport}>
        Export to CSV
      </Button>
      <Button size="sm" variant="outline" onClick={onAddToQueue}>
        Add to Queue
      </Button>
      <Button size="sm" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
