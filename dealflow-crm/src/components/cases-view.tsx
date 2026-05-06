"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, isAfter, isBefore, parseISO } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { ConsultingCaseLibrary } from "@/components/consulting-case-library";

export type CaseDTO = {
  id: string;
  name: string;
  organizer: string | null;
  date: string;
  teamMembers: string[];
  role: string | null;
  topic: string | null;
  result: string | null;
  description: string | null;
  driveLink: string | null;
  skills: string[];
  addToResume: boolean;
  resumeBullets: string[];
};

const RESULT_FILTER = ["all", "win", "finalist", "participant", "other"] as const;

function resultBadgeClass(result: string | null) {
  const r = (result ?? "").toLowerCase();
  if (/1st|first\s*place|^winner|gold/i.test(r)) {
    return "border-amber-500/40 bg-amber-500/15 text-amber-200 ring-amber-500/30";
  }
  if (/finalist|final|runner|semi/i.test(r)) {
    return "border-zinc-400/40 bg-zinc-500/15 text-zinc-200 ring-zinc-400/25";
  }
  return "border-zinc-700 bg-zinc-800/60 text-zinc-400 ring-zinc-600/30";
}

function isWin(result: string | null) {
  return /1st|first\s*place|^winner|gold/i.test(result ?? "");
}

function isFinalist(result: string | null) {
  return /finalist|final|runner|semi/i.test(result ?? "");
}

function matchesResultFilter(c: CaseDTO, f: (typeof RESULT_FILTER)[number]) {
  if (f === "all") return true;
  if (f === "win") return isWin(c.result);
  if (f === "finalist") return isFinalist(c.result) && !isWin(c.result);
  if (f === "participant") {
    const r = c.result ?? "";
    return (
      /participant|competed|entered/i.test(r) && !isWin(c.result) && !isFinalist(c.result)
    );
  }
  return !isWin(c.result) && !isFinalist(c.result) && !/participant|competed|entered/i.test(c.result ?? "");
}

export function CasesView() {
  const [pageTab, setPageTab] = useState<"competitions" | "consulting">("competitions");
  const [cases, setCases] = useState<CaseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CaseDTO | null>(null);
  const [bulletsLoading, setBulletsLoading] = useState<string | null>(null);

  const [resultFilter, setResultFilter] = useState<(typeof RESULT_FILTER)[number]>("all");
  const [skillQ, setSkillQ] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [form, setForm] = useState({
    name: "",
    organizer: "",
    date: format(new Date(), "yyyy-MM-dd"),
    teamMembers: "",
    role: "",
    topic: "",
    result: "",
    description: "",
    driveLink: "",
    skills: "",
    addToResume: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/cases", { credentials: "same-origin" });
    if (res.ok) {
      const d = (await res.json()) as { cases: CaseDTO[] };
      setCases(d.cases ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const total = cases.length;
    const wins = cases.filter((c) => isWin(c.result)).length;
    const finalist = cases.filter((c) => isFinalist(c.result) && !isWin(c.result)).length;
    return { total, wins, finalist };
  }, [cases]);

  const filtered = useMemo(() => {
    const from = fromDate ? parseISO(fromDate) : null;
    const to = toDate ? parseISO(toDate) : null;
    const sq = skillQ.trim().toLowerCase();
    return cases.filter((c) => {
      if (!matchesResultFilter(c, resultFilter)) return false;
      const cDate = parseISO(c.date);
      if (from && isBefore(cDate, from)) return false;
      if (to && isAfter(cDate, to)) return false;
      if (sq && !c.skills.some((s) => s.toLowerCase().includes(sq))) return false;
      return true;
    });
  }, [cases, resultFilter, fromDate, toDate, skillQ]);

  const openNew = () => {
    setEditing(null);
    setForm({
      name: "",
      organizer: "",
      date: format(new Date(), "yyyy-MM-dd"),
      teamMembers: "",
      role: "",
      topic: "",
      result: "",
      description: "",
      driveLink: "",
      skills: "",
      addToResume: false,
    });
    setModalOpen(true);
  };

  const openEdit = (c: CaseDTO) => {
    setEditing(c);
    setForm({
      name: c.name,
      organizer: c.organizer ?? "",
      date: c.date.slice(0, 10),
      teamMembers: c.teamMembers.join(", "),
      role: c.role ?? "",
      topic: c.topic ?? "",
      result: c.result ?? "",
      description: c.description ?? "",
      driveLink: c.driveLink ?? "",
      skills: c.skills.join(", "),
      addToResume: c.addToResume,
    });
    setModalOpen(true);
  };

  const save = async () => {
    const payload = {
      name: form.name.trim(),
      organizer: form.organizer.trim() || null,
      date: form.date,
      teamMembers: form.teamMembers
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      role: form.role.trim() || null,
      topic: form.topic.trim() || null,
      result: form.result.trim() || null,
      description: form.description.trim() || null,
      driveLink: form.driveLink.trim() || null,
      skills: form.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      addToResume: form.addToResume,
      ...(form.addToResume ? {} : { resumeBullets: [] as string[] }),
    };
    if (!payload.name) return;

    if (editing) {
      const res = await fetch(`/api/cases/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!res.ok) return;
      const prevAdd = editing.addToResume;
      if (form.addToResume && !prevAdd) {
        setBulletsLoading(editing.id);
        await fetch(`/api/cases/${editing.id}/bullets`, { method: "POST", credentials: "same-origin" });
        setBulletsLoading(null);
      }
    } else {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (!res.ok) return;
      const row = (await res.json()) as CaseDTO;
      if (form.addToResume && row?.id) {
        setBulletsLoading(row.id);
        await fetch(`/api/cases/${row.id}/bullets`, { method: "POST", credentials: "same-origin" });
        setBulletsLoading(null);
      }
    }
    setModalOpen(false);
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this case?")) return;
    await fetch(`/api/cases/${id}`, { method: "DELETE", credentials: "same-origin" });
    void load();
  };

  const toggleResume = async (c: CaseDTO, on: boolean) => {
    if (on) {
      setBulletsLoading(c.id);
      await fetch(`/api/cases/${c.id}/bullets`, { method: "POST", credentials: "same-origin" });
      setBulletsLoading(null);
    } else {
      await fetch(`/api/cases/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addToResume: false, resumeBullets: [] }),
        credentials: "same-origin",
      });
    }
    void load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-2">
        <Button type="button" size="sm" variant={pageTab === "competitions" ? "default" : "outline"} onClick={() => setPageTab("competitions")}>
          Case competitions
        </Button>
        <Button type="button" size="sm" variant={pageTab === "consulting" ? "default" : "outline"} onClick={() => setPageTab("consulting")}>
          Consulting case library
        </Button>
      </div>

      {pageTab === "consulting" ? (
        <>
          <div>
            <h1 className="page-title">Consulting case library</h1>
            <p className="mt-1 text-sm text-zinc-500">Seeded scenarios for profitability, market entry, M&amp;A, pricing, and operations.</p>
          </div>
          <ConsultingCaseLibrary />
        </>
      ) : null}

      {pageTab === "competitions" ? (
        <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Case competitions</h1>
          <p className="mt-1 text-sm text-zinc-500">Track cases, outcomes, and AI-generated resume bullets.</p>
        </div>
        <Button type="button" onClick={openNew}>
          Add case
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Total</p>
          <p className="text-2xl font-bold tabular-nums text-zinc-100">{stats.total}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Wins</p>
          <p className="text-2xl font-bold tabular-nums text-amber-300">{stats.wins}</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Finalist</p>
          <p className="text-2xl font-bold tabular-nums text-zinc-300">{stats.finalist}</p>
        </Card>
      </div>

      <Card className="flex flex-wrap gap-3 p-3">
        <label className="text-xs text-zinc-500">
          Result
          <select
            className="mt-1 block rounded border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm"
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value as (typeof RESULT_FILTER)[number])}
          >
            <option value="all">All</option>
            <option value="win">Win / 1st</option>
            <option value="finalist">Finalist</option>
            <option value="participant">Participant</option>
            <option value="other">Other / unset</option>
          </select>
        </label>
        <label className="text-xs text-zinc-500">
          Skill contains
          <Input className="mt-1 h-8 text-sm" value={skillQ} onChange={(e) => setSkillQ(e.target.value)} placeholder="e.g. LBO" />
        </label>
        <label className="text-xs text-zinc-500">
          From
          <Input className="mt-1 h-8 text-sm" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label className="text-xs text-zinc-500">
          To
          <Input className="mt-1 h-8 text-sm" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>
        <p className="self-end text-xs text-zinc-500">{loading ? "Loading…" : `${filtered.length} shown`}</p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => (
          <Card key={c.id} className="flex flex-col border-white/10 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-zinc-100">{c.name}</p>
                <p className="text-[11px] text-zinc-500">{format(parseISO(c.date), "MMM d, yyyy")}</p>
              </div>
              {c.result ? (
                <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] ring-1", resultBadgeClass(c.result))}>
                  {c.result}
                </span>
              ) : (
                <span className="text-[10px] text-zinc-600">—</span>
              )}
            </div>
            {c.topic ? <p className="mt-2 text-xs text-zinc-400">{c.topic}</p> : null}
            {c.role ? <p className="text-xs text-zinc-500">Role: {c.role}</p> : null}
            {c.teamMembers.length > 0 ? (
              <p className="mt-2 text-[11px] text-zinc-500">Team: {c.teamMembers.join(", ")}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-1">
              {c.skills.map((s) => (
                <span key={s} className="rounded border border-[#2a2a2a] bg-[#161616] px-1.5 py-0.5 text-[10px] text-[#e8e8e8]">
                  {s}
                </span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-3">
              {c.driveLink ? (
                <a
                  href={c.driveLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded border border-[#2a2a2a] px-2 py-1 text-[11px] text-[#f0f0f0] underline-offset-2 hover:bg-white/[0.04] hover:underline"
                >
                  View deck
                </a>
              ) : null}
              <button
                type="button"
                className="text-[11px] text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
                onClick={() => openEdit(c)}
              >
                Edit
              </button>
              <button
                type="button"
                className="text-[11px] text-red-400/80 hover:underline"
                onClick={() => void remove(c.id)}
              >
                Delete
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 rounded border border-white/10 bg-black/20 px-2 py-2">
              <span className="text-[11px] text-zinc-400">Add to resume bullets</span>
              <button
                type="button"
                disabled={bulletsLoading === c.id}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  c.addToResume ? "bg-[#4a6fa5]" : "bg-zinc-700",
                )}
                onClick={() => void toggleResume(c, !c.addToResume)}
                aria-pressed={c.addToResume}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                    c.addToResume ? "left-5" : "left-0.5",
                  )}
                />
              </button>
            </div>
            {c.addToResume && c.resumeBullets?.length ? (
              <ul className="mt-2 space-y-1 border-t border-white/5 pt-2 text-[11px] text-zinc-300">
                {c.resumeBullets.map((b, i) => (
                  <li key={i} className="leading-snug">
                    • {b}
                  </li>
                ))}
              </ul>
            ) : bulletsLoading === c.id ? (
              <p className="mt-2 text-[11px] text-zinc-500">Generating bullets…</p>
            ) : null}
          </Card>
        ))}
      </div>

      {!loading && filtered.length === 0 ? (
        <p className="text-center text-sm text-zinc-500">No cases match these filters.</p>
      ) : null}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit case" : "Add case"}>
        <div className="grid max-h-[70vh] gap-2 overflow-y-auto pr-1 text-sm">
          <Input placeholder="Competition name *" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Input placeholder="Organizer" value={form.organizer} onChange={(e) => setForm((f) => ({ ...f, organizer: e.target.value }))} />
          <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          <Input
            placeholder="Team members (comma-separated)"
            value={form.teamMembers}
            onChange={(e) => setForm((f) => ({ ...f, teamMembers: e.target.value }))}
          />
          <Input placeholder="Your role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
          <Input placeholder="Topic / company" value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} />
          <Input placeholder="Result (e.g. 1st Place, Finalist)" value={form.result} onChange={(e) => setForm((f) => ({ ...f, result: e.target.value }))} />
          <textarea
            className="min-h-[72px] w-full rounded border border-white/10 bg-zinc-950 p-2 text-sm"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <Input placeholder="Deck link (Google Drive)" value={form.driveLink} onChange={(e) => setForm((f) => ({ ...f, driveLink: e.target.value }))} />
          <Input
            placeholder="Skills (comma-separated)"
            value={form.skills}
            onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={form.addToResume}
              onChange={(e) => setForm((f) => ({ ...f, addToResume: e.target.checked }))}
            />
            Generate resume bullets on save (Claude)
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="button" onClick={() => void save()} disabled={!form.name.trim()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
        </>
      ) : null}
    </div>
  );
}
