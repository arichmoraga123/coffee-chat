"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/ui/search-select";

const GROUPS = ["M&A", "Leveraged Finance", "Restructuring", "ECM", "DCM", "TMT", "Healthcare", "Industrials", "FIG", "Consumer & Retail", "Energy & Power", "Real Estate", "Sponsors / FSG", "Private Equity", "Growth Equity", "Venture Capital", "Hedge Funds", "Private Credit"];

/** Groups and firms you're targeting (shared with PE@Broad if you allow it). */
export function ProfileTargetsForm({ initialGroups, initialFirms, firmSuggestions }: { initialGroups: string[]; initialFirms: string[]; firmSuggestions: string[] }) {
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [firms, setFirms] = useState(initialFirms);
  const [busy, setBusy] = useState(false);
  const opts = (xs: string[]) => [...new Set(xs)].map((x) => ({ value: x, label: x }));
  const save = async () => {
    setBusy(true);
    const res = await fetch("/api/user/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recruitingTarget: groups, targetFirms: firms }) });
    setBusy(false);
    if (res.ok) {
      toast("Targets saved");
      router.refresh();
    } else toast.error("Couldn't save targets.");
  };
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-[13px] font-medium text-ink-2">Groups</label>
        <SearchSelect multiple value={groups} options={opts([...GROUPS, ...groups])} placeholder="e.g. M&A, Sponsors" ariaLabel="Target groups" onChange={(v) => setGroups(v)} onCreate={(g) => ({ value: g, label: g })} />
      </div>
      <div>
        <label className="mb-1 block text-[13px] font-medium text-ink-2">Firms</label>
        <SearchSelect multiple value={firms} options={opts([...firmSuggestions, ...firms])} placeholder="e.g. Evercore, KKR" ariaLabel="Target firms" onChange={(v) => setFirms(v)} onCreate={(f) => ({ value: f, label: f })} />
      </div>
      <Button variant="primary" size="sm" disabled={busy} onClick={() => void save()}>
        Save targets
      </Button>
    </div>
  );
}
