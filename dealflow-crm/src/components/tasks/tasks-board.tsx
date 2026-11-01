"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import { SearchSelect, type SearchOption } from "@/components/ui/search-select";
import { Select } from "@/components/ui/select";
import { bulkRequest } from "@/components/ui/bulk";
import { LogInteractionDialog } from "@/components/contacts/log-interaction-dialog";
import type { TaskRow } from "@/lib/tasks-data";
import { cn } from "@/lib/utils";

type Section = "overdue" | "today" | "week" | "later" | "done";
const SECTIONS: { key: Section; label: string }[] = [
  { key: "overdue", label: "Overdue" },
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "later", label: "Later" },
  { key: "done", label: "Done" },
];

const localYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localYmd(d);
};
const fmtDue = (ymd: string) => new Date(`${ymd}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

function SnoozeMenu({ onPick }: { onPick: (ymd: string) => void }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const pick = (v: string) => {
    setOpen(false);
    onPick(v);
  };
  return (
    <div className="relative" ref={ref}>
      <Button size="sm" variant="ghost" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Snooze
      </Button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-52 rounded-[var(--radius)] border border-border bg-surface p-1 text-[13px] shadow-lg">
          <button type="button" className="block w-full rounded px-3 py-2 text-left hover:bg-surface-2" onClick={() => pick(plusDays(2))}>
            2 days
          </button>
          <button type="button" className="block w-full rounded px-3 py-2 text-left hover:bg-surface-2" onClick={() => pick(plusDays(7))}>
            1 week
          </button>
          <div className="flex items-center gap-1 border-t border-divider px-2 pb-1 pt-2">
            <Input type="date" value={date} min={plusDays(1)} onChange={(e) => setDate(e.target.value)} className="h-8" aria-label="Snooze until" />
            <Button size="sm" variant="secondary" disabled={!date} onClick={() => pick(date)}>
              Set
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function TasksBoard({ tasks }: { tasks: TaskRow[] }) {
  const router = useRouter();
  const [logFor, setLogFor] = useState<TaskRow | null>(null);
  const [adding, setAdding] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const grouped = useMemo(() => {
    const today = localYmd(new Date());
    const weekEnd = plusDays(7);
    const g: Record<Section, TaskRow[]> = { overdue: [], today: [], week: [], later: [], done: [] };
    for (const t of tasks) {
      if (t.done) g.done.push(t);
      else if (t.due < today) g.overdue.push(t);
      else if (t.due === today) g.today.push(t);
      else if (t.due <= weekEnd) g.week.push(t);
      else g.later.push(t);
    }
    return g;
  }, [tasks]);

  useEffect(() => {
    const onShortcut = (e: Event) => {
      if ((e as CustomEvent<string>).detail === "t") setAdding(true);
    };
    window.addEventListener("prospect-shortcut", onShortcut);
    return () => window.removeEventListener("prospect-shortcut", onShortcut);
  }, []);

  const act = (t: TaskRow, action: "done" | "dismiss" | "snooze", value?: string) =>
    bulkRequest(
      { entity: "tasks", ids: [t.id], op: "action", action, ...(value ? { value } : {}) },
      {
        success: () => (action === "done" ? `Done: ${t.title}` : action === "dismiss" ? "Dismissed" : `Snoozed to ${fmtDue(value!)}`),
        onChange: () => router.refresh(),
      },
    );

  const open = tasks.filter((t) => !t.done).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-4 text-[13px] text-ink-3">
          {SECTIONS.slice(0, 4).map((s) => (
            <span key={s.key}>
              <span className={cn("font-semibold", s.key === "overdue" && grouped.overdue.length ? "text-warn" : "text-ink")}>{grouped[s.key].length}</span> {s.label.toLowerCase()}
            </span>
          ))}
        </div>
        <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
          Add task
        </Button>
      </div>

      {open === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface px-5 py-8 text-center">
          <p className="text-sm font-medium text-ink">You&apos;re all caught up.</p>
          <p className="mt-1 text-[13px] text-ink-3">Reminders show up here when someone needs a bump, a thank-you, or a check-in. Log interactions or import your rolodex to get them.</p>
          <div className="mt-3 flex justify-center gap-2">
            <Button size="sm" variant="secondary" asChild>
              <Link href="/contacts/import">Import contacts</Link>
            </Button>
          </div>
        </div>
      ) : null}

      {SECTIONS.map(({ key, label }) => {
        const rows = grouped[key];
        if (!rows.length) return null;
        if (key === "done") {
          return (
            <section key={key}>
              <button type="button" className="section-title text-ink-2 hover:text-ink" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
                {showDone ? "Hide" : "Show"} done ({rows.length})
              </button>
              {showDone ? (
                <ul className="mt-2 divide-y divide-divider rounded-[var(--radius-lg)] border border-border bg-surface">
                  {rows.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
                      <span className="min-w-0 truncate text-ink-3">
                        <span className="text-ink-2 line-through">{t.title}</span> · {t.contactName}
                      </span>
                      <span className="shrink-0 text-ink-3">{t.done === "dismissed" ? "Dismissed" : "Done"}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          );
        }
        return (
          <section key={key} className="space-y-2">
            <h2 className={cn("section-title", key === "overdue" && "text-warn")}>
              {label} <span className="font-normal text-ink-3">({rows.length})</span>
            </h2>
            <ul className="divide-y divide-divider rounded-[var(--radius-lg)] border border-border bg-surface">
              {rows.map((t) => (
                <li key={t.id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm text-ink">
                      <span className="font-semibold">{t.title}</span>
                      <span className="text-ink-3"> · </span>
                      <Link href={`/contacts/${t.contactId}`} className="font-medium hover:underline">
                        {t.contactName}
                      </Link>
                      <span className="text-ink-3">, {t.firmName}</span>
                    </p>
                    <p className={cn("text-[13px]", key === "overdue" ? "text-warn" : "text-ink-3")}>
                      {key === "overdue" ? "Was due" : "Due"} {fmtDue(t.due)}
                      {t.snoozed ? " · snoozed" : ""}
                      {t.detail ? <span className="text-ink-3"> · {t.detail}</span> : null}
                    </p>
                    {t.lastSnippet ? <p className="line-clamp-2 text-[13px] text-ink-2">Last: {t.lastSnippet}</p> : null}
                    {t.advice ? <p className="line-clamp-2 text-[13px] text-ink-2">Advice: {t.advice}</p> : null}
                  </div>
                  <div className="flex flex-wrap items-start gap-1 md:justify-end">
                    {t.draft ? (
                      <Button size="sm" variant="secondary" asChild>
                        <Link href={`/emails?contact=${t.contactId}&kind=${t.draft}`}>Draft email</Link>
                      </Button>
                    ) : null}
                    <Button size="sm" variant="secondary" onClick={() => setLogFor(t)}>
                      Log
                    </Button>
                    <SnoozeMenu onPick={(d) => void act(t, "snooze", d)} />
                    <Button size="sm" variant="ghost" onClick={() => void act(t, "done")}>
                      Done
                    </Button>
                    <Button size="sm" variant="ghost" className="text-ink-3" onClick={() => void act(t, "dismiss")}>
                      Dismiss
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <LogInteractionDialog
        open={Boolean(logFor)}
        onClose={() => setLogFor(null)}
        contact={logFor ? { value: logFor.contactId, label: logFor.contactName } : null}
        defaultKind={logFor?.draft === "thank-you" ? "thank_you" : logFor?.draft === "bump" ? "followup_email" : "coffee_chat"}
        onSaved={() => {
          const t = logFor;
          if (t) void fetch("/api/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity: "tasks", ids: [t.id], op: "action", action: "done" }) }).then(() => router.refresh());
          else router.refresh();
        }}
      />
      <AddTaskDialog open={adding} onClose={() => setAdding(false)} onSaved={() => router.refresh()} />
    </div>
  );
}

function AddTaskDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [contact, setContact] = useState<SearchOption | null>(null);
  const [due, setDue] = useState("");
  const [type, setType] = useState("FOLLOW_UP");
  const [notes, setNotes] = useState("");
  useEffect(() => {
    if (open) {
      setContact(null);
      setDue(plusDays(1));
      setType("FOLLOW_UP");
      setNotes("");
    }
  }, [open]);
  const label = "mb-1 block text-[13px] font-medium text-ink-2";
  const save = async () => {
    if (!contact) return toast.error("Pick a contact.");
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: contact.value, dueDate: due, taskType: type, notes }),
    });
    if (!res.ok) return toast.error("Couldn't add the task.");
    toast("Task added");
    onSaved();
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Add task">
      <div className="space-y-3 text-sm">
        <div>
          <label className={label}>Contact</label>
          <SearchSelect
            endpoint="/api/search/contacts"
            value={contact?.value ?? ""}
            knownOptions={contact ? [contact] : []}
            ariaLabel="Contact"
            placeholder="Search contacts"
            onChange={(v, opt) => setContact(opt ?? (v ? { value: v, label: v } : null))}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>Due</label>
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div>
            <label className={label}>Type</label>
            <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">
              <option value="FOLLOW_UP">Follow up</option>
              <option value="THANK_YOU">Send a thank-you</option>
              <option value="CHECK_IN">Check in</option>
              <option value="APPLY">Apply</option>
            </Select>
          </div>
        </div>
        <div>
          <label className={label}>What to do</label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-20" placeholder="Send the deck she asked for" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void save()}>
            Add task
          </Button>
        </div>
      </div>
    </Modal>
  );
}
