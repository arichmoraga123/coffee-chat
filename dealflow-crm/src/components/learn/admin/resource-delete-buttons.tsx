"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DeleteResourceButton({ id, label, live }: { id: string; label: string; live: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      className="text-xs font-medium text-danger hover:underline disabled:opacity-50"
      onClick={async () => {
        const msg = live ? `Delete ${label}? It's the live version, so the previous version (if any) becomes live.` : `Delete ${label}?`;
        if (!confirm(msg)) return;
        setBusy(true);
        const res = await fetch(`/api/admin/learn/resources/${id}`, { method: "DELETE" });
        setBusy(false);
        if (!res.ok) return toast.error("Couldn't delete it.");
        toast(`Deleted ${label}`);
        router.refresh();
      }}
    >
      Delete
    </button>
  );
}

export function PruneOldVersionsButton({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (!count) return null;
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={busy}
      onClick={async () => {
        if (!confirm(`Delete ${count} old version${count === 1 ? "" : "s"}? The newest student file and answer key for each workbook stay live.`)) return;
        setBusy(true);
        const res = await fetch("/api/admin/learn/resources/prune", { method: "POST" });
        setBusy(false);
        const d = (await res.json().catch(() => ({}))) as { deleted?: number };
        if (!res.ok) return toast.error("Couldn't delete old versions.");
        toast(`Deleted ${d.deleted} old version${d.deleted === 1 ? "" : "s"}`);
        router.refresh();
      }}
    >
      Delete {count} old version{count === 1 ? "" : "s"}
    </Button>
  );
}
