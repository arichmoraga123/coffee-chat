"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/** Settings → Data: fix dates from old imports, and move never-contacted LinkedIn imports to Network. */
export function DataRepairCard() {
  const router = useRouter();
  const [plan, setPlan] = useState<{ interactions: number; dates: number; network: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const load = async () => {
    const res = await fetch("/api/user/data-repair");
    if (res.ok) setPlan(await res.json());
  };
  useEffect(() => {
    void load();
  }, []);
  const run = async (action: "dates" | "network", confirmText: string) => {
    if (!confirm(confirmText)) return;
    setBusy(action);
    const res = await fetch("/api/user/data-repair", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    setBusy(null);
    if (!res.ok) return toast.error("That didn't work.");
    const d = (await res.json()) as { changed: number };
    toast(action === "dates" ? `Fixed ${d.changed} item${d.changed === 1 ? "" : "s"}` : `Moved ${d.changed} contact${d.changed === 1 ? "" : "s"} to Network`);
    await load();
    router.refresh();
  };
  if (!plan) return <p className="text-sm text-ink-3">Checking your data…</p>;
  const fixCount = plan.dates + plan.interactions;
  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="max-w-xl">
          <p className="font-medium text-ink">Fix dates from old imports</p>
          <p className="text-[13px] text-ink-3">
            Older imports marked contacts as contacted on the upload or LinkedIn connection date, so they all looked overdue. This resets “last contacted” to
            your real conversations only. {fixCount ? `${plan.dates} date${plan.dates === 1 ? "" : "s"} and ${plan.interactions} placeholder interaction${plan.interactions === 1 ? "" : "s"} to fix.` : "Nothing to fix."}
          </p>
        </div>
        <Button variant="secondary" size="sm" disabled={!fixCount || busy !== null} onClick={() => void run("dates", `Fix ${fixCount} item(s)? Your real conversations are not touched.`)}>
          {busy === "dates" ? "Fixing…" : "Fix dates"}
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-4">
        <div className="max-w-xl">
          <p className="font-medium text-ink">Move LinkedIn imports with no conversations to Network</p>
          <p className="text-[13px] text-ink-3">
            Keeps them searchable without reminders or follow-ups. {plan.network ? `${plan.network} contact${plan.network === 1 ? "" : "s"} would move.` : "Nothing to move."}
          </p>
        </div>
        <Button variant="secondary" size="sm" disabled={!plan.network || busy !== null} onClick={() => void run("network", `Move ${plan.network} LinkedIn-imported contact(s) with no conversations to Network?`)}>
          {busy === "network" ? "Moving…" : "Move to Network"}
        </Button>
      </div>
    </div>
  );
}
