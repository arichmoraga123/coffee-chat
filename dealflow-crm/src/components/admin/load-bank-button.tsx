"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function LoadBankButton({ loaded, total }: { loaded: number; total: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/questions/load-bank", { method: "POST" });
      const d = (await res.json().catch(() => ({}))) as { loaded?: number; total?: number; error?: string };
      if (!res.ok) throw new Error(d.error ?? "Couldn't load the bank.");
      toast.success(`Question bank loaded: ${d.loaded} of ${d.total} questions.`);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const done = loaded >= total;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
      <p className="text-sm text-ink">
        PE@Broad question bank: <span className="font-semibold tabular-nums">{loaded}</span> of {total} loaded
        {done ? " — up to date." : "."}
      </p>
      <Button size="sm" variant={done ? "secondary" : "primary"} disabled={busy} onClick={() => void run()}>
        {busy ? "Loading… (about a minute)" : done ? "Reload question bank" : "Load question bank"}
      </Button>
      <p className="w-full text-[12px] text-ink-3">Adds new questions and updates existing ones by id. Nothing is deleted, and students keep their history.</p>
    </div>
  );
}
