"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
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
  notes: string | null;
  sourceUrl: string | null;
  verified: boolean;
  upvotes: number;
  userVoted: boolean;
};

const TYPE_BG: Record<string, string> = {
  "Apps Open": "bg-emerald-600/85",
  "Apps Close": "bg-red-600/85",
  "Info Session": "bg-blue-600/85",
  "First Round": "bg-amber-500/85",
  Superday: "bg-orange-600/85",
  "Offer Deadline": "bg-violet-600/85",
  "On-Cycle Start": "bg-[#4a6fa5]/85",
  "Networking Event": "bg-zinc-600/85",
};

const VERTICALS = ["all", "IB", "PE", "VC", "Real Estate", "HF", "Other"] as const;

export function RecruitingSeasonCalendarView() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [yearFilter, setYearFilter] = useState(() => String(new Date().getFullYear()));
  const [vertical, setVertical] = useState<string>("all");
  const [events, setEvents] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    firmName: "",
    vertical: "",
    eventType: "Apps Open",
    date: format(new Date(), "yyyy-MM-dd"),
    year: new Date().getFullYear(),
    sourceUrl: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (yearFilter) p.set("year", yearFilter);
    if (vertical !== "all") p.set("vertical", vertical);
    const res = await fetch(`/api/recruiting-calendar/events?${p.toString()}`, { credentials: "same-origin" });
    if (res.ok) {
      const d = (await res.json()) as { events: Ev[] };
      setEvents(d.events ?? []);
    }
    setLoading(false);
  }, [yearFilter, vertical]);

  useEffect(() => {
    void load();
  }, [load]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, Ev[]>();
    for (const e of events) {
      const key = format(new Date(e.date), "yyyy-MM-dd");
      const cur = map.get(key) ?? [];
      cur.push(e);
      map.set(key, cur);
    }
    return map;
  }, [events]);

  const vote = async (id: string) => {
    const res = await fetch(`/api/recruiting-calendar/events/${id}/vote`, {
      method: "POST",
      credentials: "same-origin",
    });
    if (res.ok) void load();
  };

  const submit = async () => {
    const res = await fetch("/api/recruiting-calendar/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        ...form,
        year: Number(form.year),
      }),
    });
    if (!res.ok) return;
    setModalOpen(false);
    void load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm text-amber-100/90">
        Dates are crowdsourced — always verify deadlines on official firm websites before acting.
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="page-title">Recruiting calendar</h1>
        <Button size="sm" onClick={() => setModalOpen(true)}>
          Submit event
        </Button>
      </div>

      <Card className="flex flex-wrap items-end gap-3 p-3">
        <label className="text-xs text-zinc-500">
          Year
          <select
            className="mt-1 block rounded border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm"
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-zinc-500">
          Vertical
          <select
            className="mt-1 block rounded border border-white/10 bg-zinc-950 px-2 py-1.5 text-sm"
            value={vertical}
            onChange={(e) => setVertical(e.target.value)}
          >
            {VERTICALS.map((v) => (
              <option key={v} value={v}>
                {v === "all" ? "All" : v}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-zinc-500">{loading ? "Loading…" : `${events.length} events`}</p>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setCursor((c) => addMonths(c, -1))}>
          Prev
        </Button>
        <p className="min-w-[140px] text-center text-sm font-medium text-zinc-200">{format(cursor, "MMMM yyyy")}</p>
        <Button size="sm" variant="outline" onClick={() => setCursor((c) => addMonths(c, 1))}>
          Next
        </Button>
      </div>

      <Card className="p-3">
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-zinc-500">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {monthDays.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const items = itemsByDay.get(key) ?? [];
            const inMonth = isSameMonth(day, cursor);
            return (
              <div
                key={key}
                className={cn(
                  "min-h-[88px] rounded border border-white/10 p-1 text-left",
                  inMonth ? "bg-black/30" : "bg-zinc-950/40 opacity-50",
                  isSameDay(day, new Date()) && "ring-1 ring-[#4a6fa5]/50",
                )}
              >
                <p className="text-[10px] font-mono text-zinc-400">{format(day, "d")}</p>
                <div className="mt-1 space-y-0.5">
                  {items.slice(0, 3).map((it) => (
                    <div
                      key={it.id}
                      className={cn(
                        "truncate rounded px-1 py-0.5 text-[9px] text-white",
                        TYPE_BG[it.eventType] ?? "bg-zinc-600/85",
                      )}
                      title={it.title}
                    >
                      {it.title}
                    </div>
                  ))}
                  {items.length > 3 ? (
                    <p className="text-[9px] text-zinc-500">+{items.length - 3}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-3">
        <p className="mb-2 text-sm font-semibold text-zinc-200">All loaded events</p>
        <div className="space-y-2 text-xs">
          {events.map((e) => (
            <div
              key={e.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded border border-white/10 px-2 py-2"
            >
              <div>
                <p className="font-medium text-zinc-100">
                  {e.title}{" "}
                  {e.verified ? (
                    <span className="rounded bg-emerald-500/20 px-1 text-[10px] text-emerald-300">Verified</span>
                  ) : null}
                </p>
                <p className="text-[10px] text-zinc-500">
                  {new Date(e.date).toLocaleDateString()} · {e.eventType}
                  {e.vertical ? ` · ${e.vertical}` : ""}
                  {e.firmName ? ` · ${e.firmName}` : ""}
                </p>
                {e.sourceUrl ? (
                  <a href={e.sourceUrl} target="_blank" rel="noreferrer" className="text-[10px] text-[#f0f0f0] underline-offset-2 hover:underline">
                    Source
                  </a>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={cn(
                    "rounded border px-2 py-1 text-[10px]",
                    e.userVoted
                      ? "border-[#4a6fa5]/50 bg-[#4a6fa5]/10 text-[#e8e8e8]"
                      : "border-white/10 text-zinc-400",
                  )}
                  onClick={() => void vote(e.id)}
                >
                  ▲ {e.upvotes}
                </button>
              </div>
            </div>
          ))}
          {!loading && events.length === 0 ? <p className="text-zinc-500">No events for these filters.</p> : null}
        </div>
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Submit recruiting event">
        <div className="grid gap-2 text-sm">
          <Input placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <Input placeholder="Firm (optional)" value={form.firmName} onChange={(e) => setForm((f) => ({ ...f, firmName: e.target.value }))} />
          <Input placeholder="Vertical e.g. IB" value={form.vertical} onChange={(e) => setForm((f) => ({ ...f, vertical: e.target.value }))} />
          <select
            className="rounded border border-white/10 bg-zinc-950 px-2 py-2"
            value={form.eventType}
            onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))}
          >
            {Object.keys(TYPE_BG).map((t) => (
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
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="button" onClick={() => void submit()} disabled={!form.title.trim()}>
              Submit
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
