"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ReportContentAction({
  targetType,
  targetId,
}: {
  targetType: string;
  targetId: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const r = reason.trim();
    if (r.length < 3) {
      setMsg("Please add a short reason.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/content-reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ targetType, targetId, reason: r }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setMsg(j.error ?? "Could not send report.");
      return;
    }
    setOpen(false);
    setReason("");
    setMsg(null);
  };

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-xs text-ink-3 hover:text-ink-2"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        Report issue
      </Button>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded border border-border bg-surface p-2" onClick={(e) => e.stopPropagation()}>
      <p className="text-xs text-ink-3">Tell admins what is wrong with this content.</p>
      <textarea
        className="min-h-[72px] w-full rounded border border-border-strong bg-surface p-2 text-xs text-ink"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason…"
      />
      {msg ? <p className="text-xs text-warn">{msg}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setOpen(false); }}>
          Cancel
        </Button>
        <Button type="button" size="sm" disabled={busy} onClick={(e) => void submit(e)}>
          Submit report
        </Button>
      </div>
    </div>
  );
}
