"use client";

import { useEffect, useMemo, useState } from "react";
import { endOfDay, endOfWeek, isPast, isToday, startOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

type TaskItem = {
  id: string;
  dueDate: string;
  taskType: string;
  status: string;
  contactName: string;
};

export function TasksList({
  initialTasks,
  contacts,
}: {
  initialTasks: TaskItem[];
  contacts: { id: string; fullName: string }[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<"today" | "week" | "overdue">("today");
  const [tasks, setTasks] = useState(initialTasks);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    contactId: contacts[0]?.id ?? "",
    dueDate: new Date().toISOString().slice(0, 10),
    taskType: "FOLLOW_UP",
    notes: "",
  });

  const filtered = useMemo(() => {
    const now = new Date();
    return tasks.filter((t) => {
      const due = new Date(t.dueDate);
      if (filter === "today") return isToday(due);
      if (filter === "week") return due >= startOfWeek(now) && due <= endOfWeek(now);
      return isPast(endOfDay(due)) && t.status !== "COMPLETED";
    });
  }, [filter, tasks]);

  const toggle = async (id: string, checked: boolean) => {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: checked ? "COMPLETED" : "PENDING" }),
    });
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: checked ? "COMPLETED" : "PENDING" } : t)),
    );
  };

  useEffect(() => {
    const onShortcut = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail === "t") setShowModal(true);
    };
    window.addEventListener("dealflow-shortcut", onShortcut);
    return () => window.removeEventListener("dealflow-shortcut", onShortcut);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex gap-2">
        {(["today", "week", "overdue"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded px-2 py-1 ${filter === f ? "bg-cyan-500/20 text-cyan-300" : "bg-zinc-800"}`}>
            {f === "today" ? "Due Today" : f === "week" ? "This Week" : "Overdue"}
          </button>
        ))}
        </div>
        <Button size="sm" onClick={() => setShowModal(true)}>New Task (T)</Button>
      </div>
      {filtered.map((t) => (
        <label key={t.id} className="flex items-center justify-between rounded border border-zinc-800 p-3 text-sm">
          <div>
            <p>{t.contactName} - {t.taskType}</p>
            <p className="text-zinc-400">{new Date(t.dueDate).toLocaleDateString()}</p>
          </div>
          <input type="checkbox" checked={t.status === "COMPLETED"} onChange={(e) => toggle(t.id, e.target.checked)} />
        </label>
      ))}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Task">
        <div className="grid gap-2">
          <select className="h-9 rounded border border-zinc-700 bg-zinc-950 px-2 text-sm" value={form.contactId} onChange={(e) => setForm((p) => ({ ...p, contactId: e.target.value }))}>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.fullName}</option>)}
          </select>
          <Input type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
          <Input value={form.taskType} onChange={(e) => setForm((p) => ({ ...p, taskType: e.target.value }))} />
          <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            onClick={async () => {
              await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
              });
              setShowModal(false);
              router.refresh();
            }}
          >
            Save
          </Button>
        </div>
      </Modal>
    </div>
  );
}
