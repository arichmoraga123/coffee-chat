"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type Props = {
  open: boolean;
  title: string;
  text: string;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
};

export function AiOutputModal({ open, title, text, loading, error, onClose }: Props) {
  const [edited, setEdited] = useState(text);

  useEffect(() => {
    if (open) setEdited(text);
  }, [open, text]);

  const copy = async () => {
    await navigator.clipboard.writeText(edited);
  };

  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-2xl">
      {loading ? (
        <p className="text-sm text-zinc-400">Generating…</p>
      ) : error ? (
        <div className="space-y-3">
          <p className="text-sm text-red-400">{error}</p>
          <div className="flex justify-end">
            <Button type="button" size="sm" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            className="min-h-[240px] w-full rounded border border-zinc-700 bg-zinc-950 p-3 text-sm leading-relaxed text-zinc-100"
            value={edited}
            onChange={(e) => setEdited(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void copy()}>
              Copy
            </Button>
            <Button type="button" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
