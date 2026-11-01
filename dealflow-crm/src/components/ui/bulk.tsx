"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { SearchSelect, type SearchOption } from "@/components/ui/search-select";
import { cn } from "@/lib/utils";

/* ───────────── selection ───────────── */

/** Checkbox selection with shift-click ranges and "select all N matching". */
export function useBulkSelection(visibleIds: string[], allMatchingIds?: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const lastIdx = useRef<number | null>(null);

  // Drop selections that no longer exist.
  const key = visibleIds.join(",") + "|" + (allMatchingIds ?? []).join(",");
  useEffect(() => {
    const pool = new Set([...(allMatchingIds ?? []), ...visibleIds]);
    setSelected((s) => new Set([...s].filter((id) => pool.has(id))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const toggle = useCallback(
    (id: string, e?: { shiftKey?: boolean }) => {
      const idx = visibleIds.indexOf(id);
      setSelected((prev) => {
        const next = new Set(prev);
        const on = !prev.has(id);
        if (e?.shiftKey && lastIdx.current !== null && idx >= 0) {
          const [a, b] = [Math.min(lastIdx.current, idx), Math.max(lastIdx.current, idx)];
          for (const x of visibleIds.slice(a, b + 1)) on ? next.add(x) : next.delete(x);
        } else on ? next.add(id) : next.delete(id);
        return next;
      });
      lastIdx.current = idx;
    },
    [visibleIds],
  );

  const pageAllSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const togglePage = () => setSelected((prev) => (pageAllSelected ? new Set([...prev].filter((id) => !visibleIds.includes(id))) : new Set([...prev, ...visibleIds])));
  const selectAllMatching = () => setSelected(new Set(allMatchingIds ?? visibleIds));
  const clear = () => setSelected(new Set());
  return { selected, ids: [...selected], count: selected.size, toggle, togglePage, pageAllSelected, selectAllMatching, clear, has: (id: string) => selected.has(id) };
}
export type BulkSelection = ReturnType<typeof useBulkSelection>;

export function SelectCheckbox({ checked, onToggle, label }: { checked: boolean; onToggle: (e: React.MouseEvent) => void; label: string }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={() => {}}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(e);
      }}
      className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
    />
  );
}

/* ───────────── requests + undo ───────────── */

type BulkBody = { entity: string; ids: string[] } & ({ op: "set"; field: string; value: unknown; tagMode?: "add" | "remove" } | { op: "action"; action: string; value?: unknown });

/** Runs a bulk change and shows "… · Undo" for 10 seconds. Returns false on failure. */
export async function bulkRequest(body: BulkBody, opts: { success: (n: number) => string; onChange?: () => void; undoable?: boolean }): Promise<boolean> {
  const res = await fetch("/api/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = (await res.json().catch(() => ({}))) as { count?: number; undo?: unknown; message?: string; error?: string };
  if (!res.ok) {
    toast.error(d.error ?? "That didn't work.");
    return false;
  }
  opts.onChange?.();
  const msg = [opts.success(d.count ?? 0), d.message].filter(Boolean).join(" · ");
  if (d.undo && opts.undoable !== false) {
    toast(msg, {
      duration: 10_000,
      action: {
        label: "Undo",
        onClick: async () => {
          const r = await fetch("/api/bulk/undo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d.undo) });
          if (r.ok) {
            toast("Undone");
            opts.onChange?.();
          } else toast.error("Couldn't undo that.");
        },
      },
    });
  } else toast(msg);
  return true;
}

/* ───────────── action bar ───────────── */

export type BulkField = {
  key: string;
  label: string;
  type: "select" | "date" | "text" | "tags";
  options?: SearchOption[];
  /** Server-backed picker (e.g. firms) */
  endpoint?: string;
};
export type BulkAction = {
  key: string;
  label: string;
  danger?: boolean;
  /** Ask for a value first (e.g. snooze date, firm to keep). */
  prompt?: { label: string; type: "date" | "select"; options?: SearchOption[] };
  /** Wording for the confirm dialog: "Delete 412 contacts? …" */
  confirm?: (n: number) => string;
  /** Run in the browser instead of the bulk endpoint (e.g. export). */
  client?: (ids: string[]) => void | Promise<void>;
  undoable?: boolean;
};

export function BulkActionBar({
  entity,
  noun,
  sel,
  totalMatching,
  fields,
  actions,
  onChange,
}: {
  entity: string;
  noun: [string, string];
  sel: BulkSelection;
  totalMatching?: number;
  fields: BulkField[];
  actions: BulkAction[];
  onChange: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [field, setField] = useState("");
  const [value, setValue] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagMode, setTagMode] = useState<"add" | "remove">("add");
  const [pending, setPending] = useState<{ action: BulkAction; value?: string } | null>(null);
  const [confirmText, setConfirmText] = useState<string | null>(null);
  const [confirmRun, setConfirmRun] = useState<(() => Promise<void>) | null>(null);
  const [busy, setBusy] = useState(false);

  const f = fields.find((x) => x.key === field);
  const n = sel.count;
  const word = n === 1 ? noun[0] : noun[1];

  const withConfirm = (text: string, run: () => Promise<void>) => {
    if (n > 10) {
      setConfirmText(text);
      setConfirmRun(() => run);
    } else void run();
  };

  const applyEdit = () => {
    if (!f) return;
    const v = f.type === "tags" ? tags : value;
    const label = f.type === "tags" ? `${tagMode === "add" ? "Add" : "Remove"} tag${tags.length === 1 ? "" : "s"} ${tags.join(", ")}` : `Set ${f.label.toLowerCase()} to ${f.options?.find((o) => o.value === value)?.label ?? (value || "blank")}`;
    withConfirm(`${label} for ${n} ${word}?`, async () => {
      setBusy(true);
      const ok = await bulkRequest(
        { entity, ids: sel.ids, op: "set", field: f.key, value: v, tagMode },
        { success: (c) => `${label} for ${c} ${c === 1 ? noun[0] : noun[1]}`, onChange },
      );
      setBusy(false);
      if (ok) {
        setEditOpen(false);
        setValue("");
        setTags([]);
      }
    });
  };

  const runAction = (a: BulkAction, v?: string) => {
    const go = async () => {
      setBusy(true);
      if (a.client) await a.client(sel.ids);
      else await bulkRequest({ entity, ids: sel.ids, op: "action", action: a.key, value: v }, { success: (c) => `${a.label}: ${c} ${c === 1 ? noun[0] : noun[1]}`, onChange, undoable: a.undoable });
      setBusy(false);
      setPending(null);
      if (!a.client) sel.clear();
    };
    if (a.confirm) {
      setConfirmText(a.confirm(n));
      setConfirmRun(() => go);
    } else withConfirm(`${a.label} ${n} ${word}?`, go);
  };

  if (!n) return null;

  return (
    <>
      <div className="sticky bottom-20 z-30 mx-auto flex w-full flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-border bg-surface px-4 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.08)] md:bottom-4">
        <span className="text-sm font-semibold text-ink">
          {n} {word} selected
        </span>
        {totalMatching && totalMatching > n ? (
          <button type="button" className="text-[13px] text-accent hover:underline" onClick={sel.selectAllMatching}>
            Select all {totalMatching} matching
          </button>
        ) : null}
        <button type="button" className="text-[13px] text-ink-3 hover:text-ink" onClick={sel.clear}>
          Clear
        </button>
        <span className="ml-auto flex flex-wrap gap-2">
          {fields.length ? (
            <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)} disabled={busy}>
              Edit fields
            </Button>
          ) : null}
          {actions.map((a) => (
            <Button
              key={a.key}
              size="sm"
              variant={a.danger ? "danger" : "secondary"}
              disabled={busy}
              onClick={() => (a.prompt ? setPending({ action: a }) : runAction(a))}
            >
              {a.label}
            </Button>
          ))}
        </span>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Edit ${n} ${word}`}>
        <div className="space-y-3">
          <SearchSelect
            value={field}
            options={fields.map((x) => ({ value: x.key, label: x.label }))}
            placeholder="Pick a field"
            ariaLabel="Field"
            onChange={(v) => {
              setField(v);
              setValue("");
              setTags([]);
            }}
          />
          {f?.type === "select" ? (
            <SearchSelect value={value} options={f.options} endpoint={f.endpoint} placeholder={`New ${f.label.toLowerCase()}`} ariaLabel={f.label} onChange={(v) => setValue(v)} />
          ) : f?.type === "date" ? (
            <Input type="date" value={value} onChange={(e) => setValue(e.target.value)} aria-label={f.label} />
          ) : f?.type === "text" ? (
            <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={`New ${f.label.toLowerCase()}`} aria-label={f.label} />
          ) : f?.type === "tags" ? (
            <>
              <div className="flex gap-2 text-sm">
                {(["add", "remove"] as const).map((m) => (
                  <label key={m} className="flex items-center gap-1.5">
                    <input type="radio" checked={tagMode === m} onChange={() => setTagMode(m)} className="accent-[var(--accent)]" />
                    {m === "add" ? "Add tags" : "Remove tags"}
                  </label>
                ))}
              </div>
              <SearchSelect multiple value={tags} options={(f.options ?? []).concat(tags.filter((t) => !(f.options ?? []).some((o) => o.value === t)).map((t) => ({ value: t, label: t })))} placeholder="Type a tag" ariaLabel="Tags" onChange={(v) => setTags(v)} onCreate={(t) => ({ value: t, label: t })} />
            </>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!f || busy || (f.type === "tags" ? !tags.length : f.type === "select" && !value)} onClick={applyEdit}>
              Apply to {n}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(pending)} onClose={() => setPending(null)} title={pending?.action.label ?? ""}>
        {pending ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-2">{pending.action.prompt?.label}</p>
            {pending.action.prompt?.type === "date" ? (
              <Input type="date" value={pending.value ?? ""} onChange={(e) => setPending({ ...pending, value: e.target.value })} />
            ) : (
              <SearchSelect value={pending.value ?? ""} options={pending.action.prompt?.options ?? []} ariaLabel={pending.action.prompt?.label} onChange={(v) => setPending({ ...pending, value: v })} />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPending(null)}>
                Cancel
              </Button>
              <Button variant="primary" disabled={!pending.value} onClick={() => runAction(pending.action, pending.value)}>
                {pending.action.label}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={Boolean(confirmText)} onClose={() => setConfirmText(null)} title="Please confirm">
        <p className="text-sm text-ink">{confirmText}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmText(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={async () => {
              const run = confirmRun;
              setConfirmText(null);
              await run?.();
            }}
          >
            Confirm
          </Button>
        </div>
      </Modal>
    </>
  );
}

/* ───────────── inline editing ───────────── */

/** Click a cell to edit one value in place. Enter saves, Esc cancels. Uses the bulk endpoint with one id. */
export function InlineEdit({
  entity,
  id,
  field,
  value,
  display,
  type = "text",
  options,
  endpoint,
  onSaved,
  className,
  ariaLabel,
}: {
  entity: string;
  id: string;
  field: string;
  value: string;
  display?: React.ReactNode;
  type?: "text" | "select" | "date";
  options?: SearchOption[];
  endpoint?: string;
  onSaved: (value: string, label?: string) => void;
  className?: string;
  ariaLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const save = async (v: string, label?: string) => {
    setEditing(false);
    if (v === value) return;
    const ok = await bulkRequest({ entity, ids: [id], op: "set", field, value: v }, { success: () => "Saved", onChange: () => onSaved(v, label) });
    if (!ok) setDraft(value);
  };
  const shown = useMemo(() => display ?? (value || <span className="text-ink-3">—</span>), [display, value]);
  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setDraft(value);
          setEditing(true);
        }}
        className={cn("group/ie inline-flex max-w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-surface-2", className)}
        aria-label={`Edit ${ariaLabel}`}
      >
        <span className="min-w-0 truncate">{shown}</span>
        <Pencil className="h-3 w-3 shrink-0 text-ink-3 opacity-0 group-hover/ie:opacity-100" aria-hidden />
      </button>
    );
  }
  if (type === "select") {
    return (
      <div className="min-w-40" onClick={(e) => e.stopPropagation()}>
        <SearchSelect
          size="sm"
          value={draft}
          options={options}
          endpoint={endpoint}
          ariaLabel={ariaLabel}
          onChange={(v, o) => void save(v, o?.label)}
          onCreate={endpoint ? undefined : (t) => ({ value: t, label: t })}
        />
        <button type="button" className="mt-1 text-xs text-ink-3" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    );
  }
  return (
    <input
      autoFocus
      type={type === "date" ? "date" : "text"}
      aria-label={ariaLabel}
      value={draft}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => void save(draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") void save(draft);
        if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      className="h-8 w-full min-w-24 rounded-[var(--radius-sm)] border border-accent bg-surface px-2 text-sm text-ink outline-none"
    />
  );
}

export function downloadCsv(name: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = [header, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob([body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
