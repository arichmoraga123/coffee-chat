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
import { RecruitingCalendarSidebar, type RecruitingSidebarEvent } from "@/components/recruiting-calendar-sidebar";
import { Select } from "@/components/ui/select";

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
  coffee_chat: "bg-info-bg",
  deadline: "bg-danger-bg",
  interview: "bg-warn-bg",
  networking: "bg-info-bg",
  other: "bg-ink-3",
};

export function CalendarView({
  initialEvents,
  initialCoffee,
  recruitingSeasonEvents = [],
}: {
  initialEvents: RecruitingEventDTO[];
  initialCoffee: CoffeeDTO[];
  recruitingSeasonEvents?: RecruitingSidebarEvent[];
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
        <RecruitingCalendarSidebar events={recruitingSeasonEvents} />
        <Card className="border-border bg-surface p-3 text-xs">
          <p className="mb-2 font-semibold text-ink">Next 14 days</p>
          <div className="space-y-2">
            {upcoming.length === 0 ? (
              <p className="text-ink-3">No upcoming items.</p>
            ) : (
              upcoming.map((u) => (
                <div key={u.id} className="rounded border border-border px-2 py-1.5">
                  <div className={cn("mb-1 h-1 w-full rounded", u.color)} />
                  <p className="font-medium text-ink">{u.label}</p>
                  <p className="text-[10px] text-ink-3">
                    {u.date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
        <div className="rounded border border-border bg-surface p-3 text-[10px] text-ink-3">
          <p className="font-semibold text-ink-2">Legend</p>
          <p className="mt-1"><span className="mr-1 inline-block size-2 rounded bg-info" /> Coffee chat</p>
          <p><span className="mr-1 inline-block size-2 rounded bg-danger" /> Deadline</p>
          <p><span className="mr-1 inline-block size-2 rounded bg-warn" /> Interview</p>
          <p><span className="mr-1 inline-block size-2 rounded bg-info" /> Networking</p>
          <p><span className="mr-1 inline-block size-2 rounded bg-ink-3" /> Other</p>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="page-title">Calendar</h1>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setCursor((c) => addMonths(c, -1))}>
              Prev
            </Button>
            <p className="min-w-[120px] text-center text-sm font-medium text-ink">{format(cursor, "MMMM yyyy")}</p>
            <Button size="sm" variant="outline" onClick={() => setCursor((c) => addMonths(c, 1))}>
              Next
            </Button>
            <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
              Add Event
            </Button>
          </div>
        </div>

        <Card className="border-border bg-surface p-3">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-ink-3">
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
                    "min-h-[88px] rounded border border-border p-1 text-left",
                    inMonth ? "bg-surface" : "bg-surface-2 opacity-60",
                    isSameDay(day, new Date()) && "ring-1 ring-accent",
                  )}
                >
                  <p className="text-[10px] font-mono text-ink-2">{format(day, "d")}</p>
                  <div className="mt-1 space-y-0.5">
                    {items.slice(0, 3).map((it) => (
                      <div key={`${it.id}-${it.label}`} className={cn("truncate rounded px-1 py-0.5 text-[9px] text-white", it.color)} title={it.label}>
                        {it.label}
                      </div>
                    ))}
                    {items.length > 3 ? (
                      <p className="text-[9px] text-ink-3">+{items.length - 3} more</p>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="border-border bg-surface p-3">
          <p className="mb-2 text-sm font-semibold text-ink">Your recruiting events</p>
          <div className="space-y-2 text-xs">
            {events.length === 0 ? (
              <p className="text-ink-3">No events yet.</p>
            ) : (
              events.map((e) => (
                <div key={e.id} className="flex items-start justify-between gap-2 rounded border border-border px-2 py-1.5">
                  <div>
                    <p className="font-medium text-ink">{e.title}</p>
                    <p className="text-[10px] text-ink-3">
                      {new Date(e.date).toLocaleString()} · {e.type.replace("_", " ")}
                      {e.firmName ? ` · ${e.firmName}` : ""}
                    </p>
                    {e.notes ? <p className="mt-1 text-ink-2">{e.notes}</p> : null}
                  </div>
                  <Button size="sm" variant="ghost" className="shrink-0 text-danger" onClick={() => void removeEvent(e.id)}>
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
            <label className="mb-1 block text-xs text-ink-3">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-ink-3">Date</label>
              <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-3">Time</label>
              <Input type="time" value={timeStr} onChange={(e) => setTimeStr(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-3">Type</label>
            <Select
              className="w-full"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="coffee_chat">Coffee chat</option>
              <option value="deadline">Deadline</option>
              <option value="interview">Interview</option>
              <option value="networking">Networking</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-3">Firm (optional)</label>
            <Input value={firmName} onChange={(e) => setFirmName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-3">Notes</label>
            <textarea
              className="min-h-[70px] w-full rounded border border-border-strong bg-surface p-2 text-sm"
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
