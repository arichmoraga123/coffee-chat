"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Ev = {
  id: string;
  title: string;
  firmName: string | null;
  vertical: string | null;
  eventType: string;
  date: string;
  endDate: string | null;
  year: number;
  isRecurring: boolean;
  notes: string | null;
  sourceUrl: string | null;
  verified: boolean;
  upvotes: number;
};

const EVENT_TYPES = [
  "Apps Open",
  "Apps Close",
  "Info Session",
  "First Round",
  "Superday",
  "Offer Deadline",
  "On-Cycle Start",
  "Networking Event",
] as const;

export function AdminRecruitingCalendarManager() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Ev | null>(null);

  const [form, setForm] = useState({
    title: "",
    firmName: "",
    vertical: "",
    eventType: "Apps Open" as (typeof EVENT_TYPES)[number],
    date: format(new Date(), "yyyy-MM-dd"),
    year: new Date().getFullYear(),
    sourceUrl: "",
    notes: "",
    verified: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/recruiting-calendar", { credentials: "same-origin" });
    if (res.ok) {
      const d = (await res.json()) as { events: Ev[] };
      setEvents(d.events ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({
      title: "",
      firmName: "",
      vertical: "",
      eventType: "Apps Open",
      date: format(new Date(), "yyyy-MM-dd"),
      year: new Date().getFullYear(),
      sourceUrl: "",
      notes: "",
      verified: false,
    });
    setModalOpen(true);
  };

  const openEdit = (e: Ev) => {
    setEditing(e);
    setForm({
      title: e.title,
      firmName: e.firmName ?? "",
      vertical: e.vertical ?? "",
      eventType: (EVENT_TYPES.find((t) => t === e.eventType) ?? "Apps Open") as (typeof EVENT_TYPES)[number],
      date: e.date.slice(0, 10),
      year: e.year,
      sourceUrl: e.sourceUrl ?? "",
      notes: e.notes ?? "",
      verified: e.verified,
    });
    setModalOpen(true);
  };

  const save = async () => {
    const body = {
      title: form.title.trim(),
      firmName: form.firmName.trim() || null,
      vertical: form.vertical.trim() || null,
      eventType: form.eventType,
      date: form.date,
      year: form.year,
      sourceUrl: form.sourceUrl.trim() || null,
      notes: form.notes.trim() || null,
      verified: form.verified,
    };
    if (!body.title) return;

    if (editing) {
      const res = await fetch(`/api/admin/recruiting-calendar/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      if (!res.ok) return;
    } else {
      const res = await fetch("/api/admin/recruiting-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      if (!res.ok) return;
    }
    setModalOpen(false);
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this recruiting calendar event?")) return;
    await fetch(`/api/admin/recruiting-calendar/${id}`, { method: "DELETE", credentials: "same-origin" });
    void load();
  };

  const toggleVerified = async (e: Ev) => {
    await fetch(`/api/admin/recruiting-calendar/${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ verified: !e.verified }),
    });
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Recruiting calendar</h1>
          <p className="text-sm text-zinc-500">Manage shared events shown to all members.</p>
        </div>
        <Button type="button" onClick={openNew}>
          Add event
        </Button>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="border-b border-white/10 bg-black/30 text-[10px] uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Vertical</th>
              <th className="px-3 py-2">Votes</th>
              <th className="px-3 py-2">Verified</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <tr key={e.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="max-w-[220px] px-3 py-2 font-medium text-zinc-200">{e.title}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-400">{format(new Date(e.date), "MMM d, yyyy")}</td>
                  <td className="px-3 py-2 text-zinc-400">{e.eventType}</td>
                  <td className="px-3 py-2 text-zinc-500">{e.vertical ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-zinc-400">{e.upvotes}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => void toggleVerified(e)}
                      className={cn(
                        "rounded px-2 py-1 text-[10px] ring-1",
                        e.verified
                          ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40"
                          : "bg-zinc-800 text-zinc-500 ring-zinc-600",
                      )}
                    >
                      {e.verified ? "Yes" : "No"}
                    </button>
                  </td>
                  <td className="space-x-2 whitespace-nowrap px-3 py-2 text-right">
                    <button type="button" className="text-cyan-400 hover:underline" onClick={() => openEdit(e)}>
                      Edit
                    </button>
                    <button type="button" className="text-red-400/90 hover:underline" onClick={() => void remove(e.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit event" : "New event"}>
        <div className="grid gap-2 text-sm">
          <Input placeholder="Title *" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Input placeholder="Firm" value={form.firmName} onChange={(e) => setForm((f) => ({ ...f, firmName: e.target.value }))} />
          <Input placeholder="Vertical (IB, PE, …)" value={form.vertical} onChange={(e) => setForm((f) => ({ ...f, vertical: e.target.value }))} />
          <select
            className="rounded border border-white/10 bg-zinc-950 px-2 py-2 text-sm"
            value={form.eventType}
            onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value as (typeof EVENT_TYPES)[number] }))}
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          <Input
            type="number"
            placeholder="Cycle year"
            value={form.year}
            onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
          />
          <Input placeholder="Source URL" value={form.sourceUrl} onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))} />
          <textarea
            className="min-h-[60px] w-full rounded border border-white/10 bg-zinc-950 p-2 text-sm"
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={form.verified}
              onChange={(e) => setForm((f) => ({ ...f, verified: e.target.checked }))}
            />
            Verified (official / trusted)
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="button" onClick={() => void save()} disabled={!form.title.trim()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
