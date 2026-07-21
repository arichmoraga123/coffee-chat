"use client";

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
      const res = await fetch(`/api/contacts/${contactId}/draft-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateType }),
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
            <div className="absolute right-0 z-50 mt-1 min-w-[180px] rounded border border-zinc-700 bg-zinc-900 py-1 shadow-lg">
              {(Object.entries(EMAIL_TEMPLATE_TYPES) as [EmailTemplateType, (typeof EMAIL_TEMPLATE_TYPES)[EmailTemplateType]][]).map(
                ([key, t]) => (
                  <button
                    key={key}
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800"
                    onClick={() => void draft(key)}
                  >
                    {t.icon} {t.label}
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
        className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
        onClick={() => setOpen((o) => !o)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 min-w-[160px] rounded border border-zinc-700 bg-zinc-900 py-1 shadow-lg">
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800"
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
                className="block w-full px-3 py-1.5 text-left text-xs text-zinc-300 hover:bg-zinc-800"
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
