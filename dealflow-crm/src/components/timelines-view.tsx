"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

export type TimelineRow = {
  id: string;
  firmName: string;
  firmType: string;
  role: string;
  applicationOpen: string | null;
  applicationClose: string | null;
  firstRound: string | null;
  finalRound: string | null;
  offerDate: string | null;
  year: number;
  notes: string | null;
  verified: boolean;
  upvotes: number;
  hasVoted: boolean;
};

function StageBar({
  label,
  date,
  colorClass,
}: {
  label: string;
  date: string | null;
  colorClass: string;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className={cn("h-2 rounded-full", date ? colorClass : "bg-zinc-800")} title={date ?? "TBD"} />
      <p className="mt-1 truncate text-[10px] text-zinc-500">{label}</p>
      <p className="truncate text-[10px] text-zinc-400">{date ? new Date(date).toLocaleDateString() : "—"}</p>
    </div>
  );
}

export function TimelinesView({
  initial,
  defaultFirmType = "all",
  defaultRole = "all",
  defaultYear = "2026",
}: {
  initial: TimelineRow[];
  defaultFirmType?: string;
  defaultRole?: string;
  defaultYear?: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [firmType, setFirmType] = useState(defaultFirmType);
  const [role, setRole] = useState(defaultRole);
  const [year, setYear] = useState(defaultYear);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    firmName: "",
    firmType: "BB",
    role: "Summer Analyst",
    year: 2026,
    notes: "",
    applicationOpen: "",
    applicationClose: "",
    firstRound: "",
    finalRound: "",
    offerDate: "",
  });

  const refetch = async () => {
    const params = new URLSearchParams();
    if (firmType !== "all") params.set("firmType", firmType);
    if (role !== "all") params.set("role", role);
    if (year !== "all") params.set("year", year);
    const res = await fetch(`/api/timelines?${params.toString()}`);
    if (!res.ok) return;
    const data = (await res.json()) as { timelines: TimelineRow[] };
    setRows(data.timelines);
  };

  const upvote = async (id: string) => {
    const res = await fetch(`/api/timelines/${id}/upvote`, { method: "POST" });
    if (!res.ok) return;
    const data = (await res.json()) as { upvotes: number };
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, upvotes: data.upvotes, hasVoted: true } : r)),
    );
    router.refresh();
  };

  const submitAdd = async () => {
    const body = {
      firmName: form.firmName,
      firmType: form.firmType,
      role: form.role,
      year: form.year,
      notes: form.notes || undefined,
      applicationOpen: form.applicationOpen || undefined,
      applicationClose: form.applicationClose || undefined,
      firstRound: form.firstRound || undefined,
      finalRound: form.finalRound || undefined,
      offerDate: form.offerDate || undefined,
    };
    const res = await fetch("/api/timelines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    setShowAdd(false);
    await refetch();
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        Timelines are crowdsourced. Always verify with firm websites and LinkedIn.
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Firm recruiting timelines</h1>
          <p className="text-sm text-zinc-400">Filter by type, role, and cycle year.</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          Add timeline
        </Button>
      </div>

      <Card className="flex flex-wrap gap-3 p-3 text-sm">
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Firm type</label>
          <select
            className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5"
            value={firmType}
            onChange={(e) => setFirmType(e.target.value)}
          >
            {["all", "BB", "EB", "MM", "PE", "VC"].map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "All" : t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Role</label>
          <select
            className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            {["all", "Summer Analyst", "Summer Associate", "Full-Time Analyst"].map((r) => (
              <option key={r} value={r}>
                {r === "all" ? "All" : r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-500">Year</label>
          <select
            className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            {["all", "2026", "2025", "2027"].map((y) => (
              <option key={y} value={y}>
                {y === "all" ? "All" : y}
              </option>
            ))}
          </select>
        </div>
        <Button size="sm" variant="outline" className="self-end" onClick={() => void refetch()}>
          Apply filters
        </Button>
      </Card>

      <div className="space-y-3">
        {rows.map((t) => (
          <Card key={t.id} className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-lg font-semibold text-zinc-100">{t.firmName}</p>
                <p className="text-sm text-zinc-400">
                  {t.firmType} · {t.role} · {t.year}
                  {!t.verified ? <span className="ml-2 text-amber-400">Unverified</span> : null}
                </p>
                {t.notes ? <p className="mt-2 text-sm text-zinc-500">{t.notes}</p> : null}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400">{t.upvotes} upvotes</span>
                <Button size="sm" variant="outline" disabled={t.hasVoted} onClick={() => void upvote(t.id)}>
                  {t.hasVoted ? "Upvoted" : "Upvote"}
                </Button>
              </div>
            </div>
            <div className="mt-4 flex gap-1">
              <StageBar label="Apps open" date={t.applicationOpen} colorClass="bg-emerald-500" />
              <StageBar label="Deadline" date={t.applicationClose} colorClass="bg-red-500" />
              <StageBar label="Interviews" date={t.firstRound ?? t.finalRound} colorClass="bg-amber-400" />
              <StageBar label="Offers" date={t.offerDate} colorClass="bg-blue-500" />
            </div>
          </Card>
        ))}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Submit timeline">
        <div className="grid max-h-[70vh] gap-2 overflow-y-auto text-sm">
          <Input placeholder="Firm name" value={form.firmName} onChange={(e) => setForm((p) => ({ ...p, firmName: e.target.value }))} />
          <select
            className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5"
            value={form.firmType}
            onChange={(e) => setForm((p) => ({ ...p, firmType: e.target.value }))}
          >
            {["BB", "EB", "MM", "PE", "VC"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Input placeholder="Role" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} />
          <Input
            type="number"
            placeholder="Year"
            value={form.year}
            onChange={(e) => setForm((p) => ({ ...p, year: Number(e.target.value) || 2026 }))}
          />
          <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
          <p className="text-xs text-zinc-500">Dates optional (YYYY-MM-DD)</p>
          <Input type="date" value={form.applicationOpen} onChange={(e) => setForm((p) => ({ ...p, applicationOpen: e.target.value }))} />
          <Input type="date" value={form.applicationClose} onChange={(e) => setForm((p) => ({ ...p, applicationClose: e.target.value }))} />
          <Input type="date" value={form.firstRound} onChange={(e) => setForm((p) => ({ ...p, firstRound: e.target.value }))} />
          <Input type="date" value={form.finalRound} onChange={(e) => setForm((p) => ({ ...p, finalRound: e.target.value }))} />
          <Input type="date" value={form.offerDate} onChange={(e) => setForm((p) => ({ ...p, offerDate: e.target.value }))} />
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowAdd(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submitAdd()}>Submit</Button>
        </div>
      </Modal>
    </div>
  );
}
