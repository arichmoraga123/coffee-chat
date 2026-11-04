"use client";

import { readAiStream } from "@/lib/read-ai-stream";
import { useState } from "react";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EMAIL_TEMPLATE_TYPES,
  type EmailTemplateType,
} from "@/lib/email-template-types";
import { AiOutputModal } from "@/components/ai-output-modal";

type Props = {
  contactId: string;
  contactName?: string;
  size?: "sm" | "default";
};

export function ContactEmailDropdown({ contactId, size = "sm" }: Props) {
  const [open, setOpen] = useState(false);
  const [aiModal, setAiModal] = useState({
    open: false,
    title: "",
    text: "",
    loading: false,
    error: null as string | null,
  });

  const draft = async (templateType: EmailTemplateType) => {
    setOpen(false);
    const label = EMAIL_TEMPLATE_TYPES[templateType].label;
    setAiModal({ open: true, title: label, text: "", loading: true, error: null });
    try {
      // The draft fills in as it's written.
      const done = await readAiStream<{ text?: string }>(`/api/contacts/${contactId}/draft-email`, { templateType }, (ev) => {
        if (typeof ev.text === "string") setAiModal((m) => ({ ...m, text: ev.text as string }));
      });
      setAiModal((m) => ({ ...m, loading: false, text: done.text ?? m.text }));
    } catch (e) {
      setAiModal((m) => ({ ...m, loading: false, error: e instanceof Error ? e.message : "Network error" }));
    }
  };

  return (
    <>
      <div className="relative">
        <Button
          size={size}
          variant="outline"
          className="h-7 gap-1 px-2 text-xs"
          onClick={() => setOpen((o) => !o)}
        >
          Email <ChevronDown className="h-3 w-3" />
        </Button>
        {open ? (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-50 mt-1 min-w-[180px] rounded border border-border-strong bg-surface py-1 ">
              {(Object.entries(EMAIL_TEMPLATE_TYPES) as [EmailTemplateType, (typeof EMAIL_TEMPLATE_TYPES)[EmailTemplateType]][]).map(
                ([key, t]) => (
                  <button
                    key={key}
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-xs text-ink-2 hover:bg-surface-2"
                    onClick={() => void draft(key)}
                  >
                    {t.label}
                  </button>
                ),
              )}
            </div>
          </>
        ) : null}
      </div>
      <AiOutputModal
        open={aiModal.open}
        title={aiModal.title}
        text={aiModal.text}
        loading={aiModal.loading}
        error={aiModal.error}
        onClose={() => setAiModal((m) => ({ ...m, open: false }))}
      />
    </>
  );
}

export function ContactRowMenu({
  contactId,
  inQueue,
  onQueueChange,
  onMarkContacted,
}: {
  contactId: string;
  inQueue: boolean;
  onQueueChange: (add: boolean) => void;
  onMarkContacted?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="rounded p-1 text-ink-3 hover:bg-surface-2 hover:text-ink-2"
        onClick={() => setOpen((o) => !o)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 min-w-[160px] rounded border border-border-strong bg-surface py-1 ">
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left text-xs text-ink-2 hover:bg-surface-2"
              onClick={() => {
                onQueueChange(!inQueue);
                setOpen(false);
              }}
            >
              {inQueue ? "Remove from queue" : "Add to Outreach Queue"}
            </button>
            {onMarkContacted ? (
              <button
                type="button"
                className="block w-full px-3 py-1.5 text-left text-xs text-ink-2 hover:bg-surface-2"
                onClick={() => {
                  onMarkContacted();
                  setOpen(false);
                }}
              >
                Mark Contacted
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
