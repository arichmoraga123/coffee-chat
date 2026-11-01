"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Markdown } from "@/components/learn/markdown";

type Props = {
  open: boolean;
  title: string;
  text: string;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
};

/** Shows AI output. Markdown (like the pre-call one-pager) renders as a formatted page; emails stay editable. */
export function AiOutputModal({ open, title, text, loading, error, onClose }: Props) {
  const [edited, setEdited] = useState(text);
  const isDoc = text.trimStart().startsWith("#");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (open) {
      setEdited(text);
      setEditing(false);
    }
  }, [open, text]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(edited);
      toast("Copied");
    } catch {
      toast.error("Couldn't copy. Select the text instead.");
    }
  };

  const print = () => {
    const w = window.open("", "_blank", "width=820,height=1000");
    if (!w) return;
    const html = document.getElementById("ai-doc")?.innerHTML ?? "";
    w.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>body{font:14px/1.55 Inter,system-ui,sans-serif;color:#12161b;max-width:720px;margin:32px auto;padding:0 24px}h1,h2{margin:18px 0 6px}h1{font-size:20px}h2{font-size:15px;text-transform:uppercase;letter-spacing:.04em;color:#4a5260}ul{padding-left:18px;margin:4px 0}li{margin:2px 0}</style></head><body>${html}</body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-2xl">
      {loading ? (
        <p className="text-sm text-ink-2">Writing… this takes a few seconds.</p>
      ) : error ? (
        <div className="space-y-3">
          <p className="text-sm text-danger">{error}</p>
          <div className="flex justify-end">
            <Button type="button" size="sm" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {isDoc && !editing ? (
            <div id="ai-doc" className="max-h-[65vh] overflow-y-auto rounded-[var(--radius)] border border-border bg-surface p-5">
              <Markdown>{edited}</Markdown>
            </div>
          ) : (
            <textarea
              className="min-h-[320px] w-full rounded-[var(--radius)] border border-border-strong bg-surface p-3 text-sm leading-relaxed text-ink"
              value={edited}
              onChange={(e) => setEdited(e.target.value)}
              aria-label={title}
            />
          )}
          <div className="flex flex-wrap justify-end gap-2">
            {isDoc ? (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditing((e) => !e)}>
                  {editing ? "Preview" : "Edit"}
                </Button>
                {!editing ? (
                  <Button type="button" variant="secondary" size="sm" onClick={print}>
                    Print / save PDF
                  </Button>
                ) : null}
              </>
            ) : null}
            <Button type="button" variant="secondary" size="sm" onClick={() => void copy()}>
              Copy
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
