"use client";

import { useMemo, useState } from "react";
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

type RecruitingEventDTO = {
  id: string;
  title: string;
  date: string;
  type: string;
  firmName: string | null;
  notes: string | null;
};

type CoffeeDTO = {
  id: string;
  date: string;
  label: string;
};

const TYPE_COLORS: Record<string, string> = {
  coffee_chat: "bg-blue-500/80",
  deadline: "bg-red-500/80",
  interview: "bg-orange-500/80",
  networking: "bg-violet-500/70",
  other: "bg-zinc-600/80",
};

export function CalendarView({
  initialEvents,
  initialCoffee,
}: {
  initialEvents: RecruitingEventDTO[];
  initialCoffee: CoffeeDTO[];
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState(initialEvents);
  const [coffee] = useState(initialCoffee);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dateStr, setDateStr] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [timeStr, setTimeStr] = useState("09:00");
  const [type, setType] = useState("coffee_chat");
  const [firmName, setFirmName] = useState("");
  const [notes, setNotes] = useState("");

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, { id: string; label: string; color: string; kind: string }[]>();
    const push = (d: Date, item: { id: string; label: string; color: string; kind: string }) => {
      const key = format(d, "yyyy-MM-dd");
      const cur = map.get(key) ?? [];
      cur.push(item);
      map.set(key, cur);
    };
    for (const e of events) {
      const d = new Date(e.date);
      push(d, {
        id: e.id,
        label: e.title,
        color: TYPE_COLORS[e.type] ?? TYPE_COLORS.other,
        kind: e.type,
      });
    }
    for (const c of coffee) {
      const d = new Date(c.date);
      push(d, {
        id: `coffee:${c.id}`,
        label: c.label,
        color: TYPE_COLORS.coffee_chat,
        kind: "coffee_chat",
      });
    }
    return map;
  }, [events, coffee]);

  const upcoming = useMemo(() => {
    const now = new Date();
    const horizon = addMonths(now, 1);
    const merged: { id: string; date: Date; label: string; color: string }[] = [];
    for (const e of events) {
      const d = new Date(e.date);
      if (d >= now && d <= horizon) {
        merged.push({
          id: e.id,
          date: d,
          label: e.title,
          color: TYPE_COLORS[e.type] ?? TYPE_COLORS.other,
        });
      }
    }
    for (const c of coffee) {
      const d = new Date(c.date);
      if (d >= now && d <= horizon) {
        merged.push({
          id: `coffee:${c.id}`,
          date: d,
          label: c.label,
          color: TYPE_COLORS.coffee_chat,
        });
      }
    }
    return merged.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 14);
  }, [events, coffee]);

  const addEvent = async () => {
    const iso = new Date(`${dateStr}T${timeStr}:00`);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, date: iso.toISOString(), type, firmName: firmName || null, notes: notes || null }),
    });
    if (!res.ok) return;
    const row = (await res.json()) as RecruitingEventDTO;
    setEvents((prev) => [...prev, row]);
    setModalOpen(false);
    setTitle("");
    setFirmName("");
    setNotes("");
  };

  const removeEvent = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <aside className="w-full shrink-0 space-y-3 lg:w-64">
        <Card className="border-zinc-800 bg-zinc-900/60 p-3 text-xs">
          <p className="mb-2 font-semibold text-zinc-200">Next 14 days</p>
          <div className="space-y-2">
            {upcoming.length === 0 ? (
              <p className="text-zinc-500">No upcoming items.</p>
            ) : (
              upcoming.map((u) => (
                <div key={u.id} className="rounded border border-zinc-800 px-2 py-1.5">
                  <div className={cn("mb-1 h-1 w-full rounded", u.color)} />
                  <p className="font-medium text-zinc-100">{u.label}</p>
                  <p className="text-[10px] text-zinc-500">
                    {u.date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
        <div className="rounded border border-zinc-800 bg-zinc-950/80 p-3 text-[10px] text-zinc-500">
          <p className="font-semibold text-zinc-300">Legend</p>
          <p className="mt-1"><span className="mr-1 inline-block size-2 rounded bg-blue-500" /> Coffee chat</p>
          <p><span className="mr-1 inline-block size-2 rounded bg-red-500" /> Deadline</p>
          <p><span className="mr-1 inline-block size-2 rounded bg-orange-500" /> Interview</p>
          <p><span className="mr-1 inline-block size-2 rounded bg-violet-500" /> Networking</p>
          <p><span className="mr-1 inline-block size-2 rounded bg-zinc-600" /> Other</p>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Calendar</h1>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setCursor((c) => addMonths(c, -1))}>
              Prev
            </Button>
            <p className="min-w-[120px] text-center text-sm font-medium text-zinc-200">{format(cursor, "MMMM yyyy")}</p>
            <Button size="sm" variant="outline" onClick={() => setCursor((c) => addMonths(c, 1))}>
              Next
            </Button>
            <Button size="sm" onClick={() => setModalOpen(true)}>
              Add Event
            </Button>
          </div>
        </div>

        <Card className="border-zinc-800 bg-zinc-900/40 p-3">
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
                    "min-h-[88px] rounded border border-zinc-800/80 p-1 text-left",
                    inMonth ? "bg-black/30" : "bg-zinc-950/40 opacity-50",
                    isSameDay(day, new Date()) && "ring-1 ring-cyan-500/50",
                  )}
                >
                  <p className="text-[10px] font-mono text-zinc-400">{format(day, "d")}</p>
                  <div className="mt-1 space-y-0.5">
                    {items.slice(0, 3).map((it) => (
                      <div key={`${it.id}-${it.label}`} className={cn("truncate rounded px-1 py-0.5 text-[9px] text-white", it.color)} title={it.label}>
                        {it.label}
                      </div>
                    ))}
                    {items.length > 3 ? (
                      <p className="text-[9px] text-zinc-500">+{items.length - 3} more</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/40 p-3">
          <p className="mb-2 text-sm font-semibold text-zinc-200">Your recruiting events</p>
          <div className="space-y-2 text-xs">
            {events.length === 0 ? (
              <p className="text-zinc-500">No events yet.</p>
            ) : (
              events.map((e) => (
                <div key={e.id} className="flex items-start justify-between gap-2 rounded border border-zinc-800 px-2 py-1.5">
                  <div>
                    <p className="font-medium text-zinc-100">{e.title}</p>
                    <p className="text-[10px] text-zinc-500">
                      {new Date(e.date).toLocaleString()} · {e.type.replace("_", " ")}
                      {e.firmName ? ` · ${e.firmName}` : ""}
                    </p>
                    {e.notes ? <p className="mt-1 text-zinc-400">{e.notes}</p> : null}
                  </div>
                  <Button size="sm" variant="ghost" className="shrink-0 text-red-400" onClick={() => void removeEvent(e.id)}>
                    Delete
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add recruiting event">
        <div className="space-y-2 text-sm">
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Date</label>
              <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Time</label>
              <Input type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Type</label>
            <select
              className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="coffee_chat">Coffee chat</option>
              <option value="deadline">Deadline</option>
              <option value="interview">Interview</option>
              <option value="networking">Networking</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Firm (optional)</label>
            <Input value={firmName} onChange={(e) => setFirmName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Notes</label>
            <textarea
              className="min-h-[70px] w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void addEvent()} disabled={!title.trim()}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
