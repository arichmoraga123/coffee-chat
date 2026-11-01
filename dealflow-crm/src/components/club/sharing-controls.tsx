"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";

type Settings = { shareLearning: boolean; shareDrill: boolean; shareTargets: boolean; shareFirms: boolean | null; classYear: number | null };

async function save(data: Partial<Settings>) {
  const res = await fetch("/api/club/sharing", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) throw new Error();
}

const FIELDS: { key: "shareLearning" | "shareDrill" | "shareTargets" | "shareFirms"; label: string; help: string }[] = [
  { key: "shareLearning", label: "Learning progress", help: "Lessons completed in each module." },
  { key: "shareDrill", label: "Drill stats", help: "Points, streak, and multiple-choice accuracy by category." },
  { key: "shareTargets", label: "Targets", help: "Groups and firms you're targeting, from your profile." },
  { key: "shareFirms", label: "Firms in contact", help: "Firm names and pipeline stage only. Never contact names, emails, or notes." },
];

export function SharingControls({ initial }: { initial: Settings }) {
  const [s, setS] = useState(initial);
  const thisYear = new Date().getFullYear();
  const update = async (patch: Partial<Settings>) => {
    const prev = s;
    setS({ ...s, ...patch });
    try {
      await save(patch);
    } catch {
      setS(prev);
      toast.error("Couldn't save that.");
    }
  };
  return (
    <div className="space-y-4">
      <Card title="What PE@Broad members can see">
        <ul className="divide-y divide-divider">
          {FIELDS.map((f) => {
            const on = s[f.key] === true;
            return (
              <li key={f.key} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{f.label}</p>
                  <p className="text-[13px] text-ink-3">{f.help}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={f.label}
                  onClick={() => void update({ [f.key]: !on })}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-border-strong"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-surface transition-transform ${on ? "left-[22px]" : "left-0.5"}`} />
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[13px] text-ink-3">Members see &ldquo;Hidden by member&rdquo; for anything you turn off.</p>
      </Card>
      <Card title="Class year">
        <Select
          value={s.classYear ?? ""}
          onChange={(e) => void update({ classYear: e.target.value ? Number(e.target.value) : null })}
          aria-label="Class year"
        >
          <option value="">Not set</option>
          {Array.from({ length: 7 }, (_, i) => thisYear - 1 + i).map((y) => (
            <option key={y} value={y}>
              Class of {y}
            </option>
          ))}
        </Select>
      </Card>
    </div>
  );
}

/** One-time question on the first club visit. */
export function FirmSharePrompt() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const answer = async (yes: boolean) => {
    setBusy(true);
    try {
      await save({ shareFirms: yes });
      router.refresh();
    } catch {
      toast.error("Couldn't save that.");
      setBusy(false);
    }
  };
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-ink">
        Share which firms you&apos;re networking with (firm name and stage only, never contact names or notes) with PE@Broad members?
      </p>
      <p className="mt-1 text-[13px] text-ink-3">It lets members compare notes before interviews. You can change this anytime in Settings.</p>
      <div className="mt-4 flex gap-2">
        <Button variant="primary" disabled={busy} onClick={() => void answer(true)}>
          Yes, share
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => void answer(false)}>
          Not now
        </Button>
      </div>
    </Card>
  );
}
