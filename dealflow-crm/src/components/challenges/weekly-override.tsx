"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Accordion } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

/** Admin: replace this week's club challenge topic (only before anyone starts it). */
export function WeeklyOverride({ modules }: { modules: { module: number; title: string }[] }) {
  const router = useRouter();
  const [mod, setMod] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!mod) return;
    setBusy(true);
    const title = modules.find((m) => String(m.module) === mod)?.title;
    const res = await fetch("/api/challenges/weekly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modules: [Number(mod)], label: `Module ${mod}: ${title}` }),
    });
    setBusy(false);
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return toast.error(d.error ?? "Couldn't change it.");
    toast("This week's challenge updated");
    router.refresh();
  };
  return (
    <Accordion title="Admin: set this week's challenge topic">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={mod} onChange={(e) => setMod(e.target.value)} aria-label="Module">
          <option value="">Pick a module</option>
          {modules.map((m) => (
            <option key={m.module} value={m.module}>
              {m.module}. {m.title}
            </option>
          ))}
        </Select>
        <Button variant="secondary" disabled={!mod || busy} onClick={() => void save()}>
          Replace topic
        </Button>
      </div>
      <p className="mt-2 text-[13px] text-ink-3">Only works before anyone has started this week&apos;s challenge.</p>
    </Accordion>
  );
}
