"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function UndoImportButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={busy}
      onClick={async () => {
        if (!confirm(`Undo ${label}? Contacts it created go to Trash (restorable for 30 days) and the interactions it added are removed. Contacts that already existed keep their record.`)) return;
        setBusy(true);
        const res = await fetch(`/api/imports/${id}/undo`, { method: "POST" });
        setBusy(false);
        const d = (await res.json().catch(() => ({}))) as { contacts?: number; interactions?: number; error?: string };
        if (!res.ok) return toast.error(d.error ?? "Couldn't undo that import.");
        toast(`Removed ${d.contacts} contacts and ${d.interactions} interactions`);
        router.refresh();
      }}
    >
      Undo this import
    </Button>
  );
}
