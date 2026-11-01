"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Search } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchSelect } from "@/components/ui/search-select";
import { BulkActionBar, InlineEdit, SelectCheckbox, bulkRequest, downloadCsv, useBulkSelection, type BulkAction, type BulkField } from "@/components/ui/bulk";
import { LogInteractionDialog } from "@/components/contacts/log-interaction-dialog";
import { NewContactDialog } from "@/components/contacts/new-contact-dialog";
import { RELATIONSHIP_STAGES } from "@/lib/followups";
import { matchScore } from "@/lib/fuzzy";
import type { ContactListRow } from "@/lib/contacts-list";
import { cn } from "@/lib/utils";

type View = "active" | "network" | "trash";

const STAGE_OPTIONS = RELATIONSHIP_STAGES.map((s) => ({ value: s, label: s }));
const PRIORITY_OPTIONS = [
  { value: "A", label: "A – top target" },
  { value: "B", label: "B – active" },
  { value: "C", label: "C – keep warm" },
];
const TRACKS = ["IB", "PE", "GE", "VC", "HF"].map((t) => ({ value: t, label: t }));
const PAGE = 100;

function relative(iso: string | null) {
  if (!iso) return null;
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
}

export function ContactsTable({ rows, view, firms }: { rows: ContactListRow[]; view: View; firms: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [firm, setFirm] = useState(sp.get("firm") ?? "");
  const [stage, setStage] = useState(sp.get("stage") ?? "");
  const [track, setTrack] = useState(sp.get("track") ?? "");
  const [priority, setPriority] = useState(sp.get("priority") ?? "");
  const [limit, setLimit] = useState(PAGE);
  const [local, setLocal] = useState(rows);
  const [newOpen, setNewOpen] = useState(false);
  const [logFor, setLogFor] = useState<{ value: string; label: string } | null | undefined>(undefined);
  const [menu, setMenu] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => setLocal(rows), [rows]);
  const refresh = useCallback(() => router.refresh(), [router]);

  // Keep the search and filters in the URL so Back works and links can be shared.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = new URLSearchParams(sp.toString());
      const set = (k: string, v: string) => (v ? next.set(k, v) : next.delete(k));
      set("q", q.trim());
      set("firm", firm);
      set("stage", stage);
      set("track", track);
      set("priority", priority);
      const s = next.toString();
      if (s !== sp.toString()) router.replace(`${pathname}${s ? `?${s}` : ""}`, { scroll: false });
    }, 250);
    return () => window.clearTimeout(t);
  }, [q, firm, stage, track, priority, pathname, router, sp]);

  // "/" focuses search; C = new contact; I = log interaction.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable)) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    const onShortcut = (e: Event) => {
      const k = (e as CustomEvent<string>).detail;
      if (k === "c") setNewOpen(true);
      if (k === "i") setLogFor(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("prospect-shortcut", onShortcut);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("prospect-shortcut", onShortcut);
    };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = local.filter(
      (r) => (!firm || r.firmId === firm) && (!stage || r.stage === stage) && (!track || r.track === track) && (!priority || (r.priority ?? "") === priority),
    );
    if (term) {
      const scored = list
        .map((r) => {
          const m = matchScore(r.fullName, term) ?? matchScore(r.firmName, term);
          const s = m ? m.score : r.searchText.includes(term) ? 50 : 0;
          return { r, s };
        })
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s);
      list = scored.map((x) => x.r);
    }
    return list;
  }, [local, q, firm, stage, track, priority]);

  // Search by firm: when the query matches firm names, group results under firm headers.
  const groupByFirm = useMemo(() => {
    const term = q.trim();
    if (term.length < 2) return false;
    return filtered.some((r) => (matchScore(r.firmName, term)?.score ?? 0) >= 400);
  }, [filtered, q]);

  const shown = filtered.slice(0, limit);
  const sel = useBulkSelection(shown.map((r) => r.id), filtered.map((r) => r.id));
  const firmOptions = useMemo(() => firms.map((f) => ({ value: f.id, label: f.name })), [firms]);

  const patchLocal = (id: string, patch: Partial<ContactListRow>) => setLocal((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const exportCsv = (ids: string[]) => {
    const set = new Set(ids);
    downloadCsv(
      "contacts.csv",
      ["Name", "Firm", "Title", "Group", "Email", "Stage", "Priority", "Last contacted", "Next step", "Tags"],
      local.filter((r) => set.has(r.id)).map((r) => [r.fullName, r.firmName, r.title, r.group, r.email, r.stage, r.priority, r.lastContacted?.slice(0, 10), r.next ? `${r.next.label} (${r.next.due.slice(0, 10)})` : "", r.tags.join("; ")]),
    );
  };

  const fields: BulkField[] =
    view === "trash"
      ? []
      : [
          { key: "relationshipStage", label: "Stage", type: "select", options: STAGE_OPTIONS },
          { key: "priority", label: "Priority", type: "select", options: PRIORITY_OPTIONS },
          { key: "firmId", label: "Firm", type: "select", endpoint: "/api/search/firms" },
          { key: "title", label: "Title", type: "text" },
          { key: "group", label: "Group", type: "text" },
          { key: "tags", label: "Tags", type: "tags", options: [...new Set(local.flatMap((r) => r.tags))].map((t) => ({ value: t, label: t })) },
        ];
  const actions: BulkAction[] =
    view === "trash"
      ? [
          { key: "restore", label: "Restore" },
          { key: "purge", label: "Delete forever", danger: true, undoable: false, confirm: (n) => `Permanently delete ${n} contact${n === 1 ? "" : "s"} and their history? This can't be undone.` },
        ]
      : [
          view === "network" ? { key: "activate", label: "Add to contacts" } : { key: "network", label: "Move to Network" },
          { key: "dnc", label: "Do not contact" },
          { key: "export", label: "Export CSV", client: exportCsv },
          { key: "delete", label: "Delete", danger: true, confirm: (n) => `Delete ${n} contact${n === 1 ? "" : "s"}? You can restore them from Trash for 30 days.` },
        ];

  const rowAction = async (r: ContactListRow, action: string, success: string) => {
    setMenu(null);
    await bulkRequest({ entity: "contacts", ids: [r.id], op: "action", action }, { success: () => success, onChange: refresh });
  };

  const renderRow = (r: ContactListRow) => (
    <tr key={r.id} className={cn("border-b border-divider align-top", sel.has(r.id) && "bg-accent-tint/60")}>
      <td className="w-10 px-3 py-3">
        <SelectCheckbox checked={sel.has(r.id)} onToggle={(e) => sel.toggle(r.id, e)} label={`Select ${r.fullName}`} />
      </td>
      <td className="min-w-56 px-3 py-3">
        <Link href={`/contacts/${r.id}`} className="font-medium text-ink hover:underline">
          {r.fullName}
        </Link>
        {r.doNotContact ? <Badge tone="danger" className="ml-2">Do not contact</Badge> : null}
        <p className="mt-0.5 line-clamp-2 text-[13px] text-ink-3">{r.lastSnippet ? `Last: ${r.lastSnippet}` : "Not contacted yet"}</p>
      </td>
      <td className="px-3 py-3">
        <Link href={`/firms/${r.firmId}`} className="text-ink-2 hover:text-ink hover:underline">
          {r.firmName}
        </Link>
      </td>
      <td className="px-3 py-3 text-ink-2">
        {view === "trash" ? r.title || "—" : <InlineEdit entity="contacts" id={r.id} field="title" value={r.title} ariaLabel={`title for ${r.fullName}`} onSaved={(v) => patchLocal(r.id, { title: v })} />}
      </td>
      <td className="px-3 py-3">
        {view === "trash" ? (
          r.stage
        ) : (
          <InlineEdit entity="contacts" id={r.id} field="relationshipStage" type="select" options={STAGE_OPTIONS} value={r.stage} ariaLabel={`stage for ${r.fullName}`} onSaved={(v) => patchLocal(r.id, { stage: v })} />
        )}
      </td>
      <td className="px-3 py-3">
        {view === "trash" ? (
          r.priority ?? "—"
        ) : (
          <InlineEdit
            entity="contacts"
            id={r.id}
            field="priority"
            type="select"
            options={PRIORITY_OPTIONS}
            value={r.priority ?? ""}
            display={r.priority ? <Badge tone={r.priority === "A" ? "accent" : "neutral"}>{r.priority}</Badge> : undefined}
            ariaLabel={`priority for ${r.fullName}`}
            onSaved={(v) => patchLocal(r.id, { priority: v })}
          />
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-[13px] text-ink-2">{relative(r.lastContacted) ?? <span className="text-ink-3">Not contacted yet</span>}</td>
      <td className="px-3 py-3 text-[13px]">
        {view === "trash" ? (
          <span className="text-ink-3">Deleted {relative(r.deletedAt)}</span>
        ) : r.next ? (
          <span className={cn("block max-w-[200px]", r.next.overdue ? "text-warn" : "text-ink-2")} title={r.next.label}>
            <span className="line-clamp-2">{r.next.label}</span>
            <span className="block text-ink-3">{r.next.overdue ? "Overdue" : `Due ${new Date(r.next.due).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`}</span>
          </span>
        ) : r.goneCold ? (
          <span className="text-ink-3">Gone cold</span>
        ) : (
          <span className="text-ink-3">—</span>
        )}
      </td>
      <td className="relative w-10 px-2 py-3 text-right">
        <button type="button" aria-label={`More actions for ${r.fullName}`} onClick={() => setMenu(menu === r.id ? null : r.id)} className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] text-ink-3 hover:bg-surface-2 hover:text-ink">
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {menu === r.id ? (
          <div className="absolute right-2 top-11 z-40 w-48 rounded-[var(--radius)] border border-border bg-surface py-1 text-left text-sm shadow-[0_4px_16px_rgba(0,0,0,0.08)]" onMouseLeave={() => setMenu(null)}>
            {view === "trash" ? (
              <button type="button" className="block w-full px-3 py-2 text-left hover:bg-surface-2" onClick={() => void rowAction(r, "restore", `Restored ${r.fullName}`)}>
                Restore
              </button>
            ) : (
              <>
                <Link href={`/contacts/${r.id}`} className="block px-3 py-2 hover:bg-surface-2">
                  Open
                </Link>
                <Link href={`/emails?contact=${r.id}${r.next?.draft ? `&kind=${r.next.draft === "follow-up" ? "follow-up" : r.next.draft}` : ""}`} className="block px-3 py-2 hover:bg-surface-2">
                  Draft email
                </Link>
                <button type="button" className="block w-full px-3 py-2 text-left hover:bg-surface-2" onClick={() => (setMenu(null), setLogFor({ value: r.id, label: r.fullName }))}>
                  Log interaction
                </button>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left hover:bg-surface-2"
                  onClick={() => void rowAction(r, view === "network" ? "activate" : "network", view === "network" ? `Added ${r.fullName} to contacts` : `Moved ${r.fullName} to Network`)}
                >
                  {view === "network" ? "Add to contacts" : "Move to Network"}
                </button>
                <button type="button" className="block w-full px-3 py-2 text-left text-danger hover:bg-surface-2" onClick={() => void rowAction(r, "delete", `Deleted ${r.fullName}`)}>
                  Delete
                </button>
              </>
            )}
          </div>
        ) : null}
      </td>
    </tr>
  );

  const grouped = useMemo(() => {
    if (!groupByFirm) return null;
    const m = new Map<string, { firmId: string; firmName: string; rows: ContactListRow[] }>();
    for (const r of shown) {
      const g = m.get(r.firmId) ?? { firmId: r.firmId, firmName: r.firmName, rows: [] };
      g.rows.push(r);
      m.set(r.firmId, g);
    }
    return [...m.values()];
  }, [groupByFirm, shown]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setLimit(PAGE);
            }}
            placeholder="Search name, firm, notes…  ( / )"
            aria-label="Search contacts"
            className="h-9 w-full rounded-[var(--radius)] border border-border-strong bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-3 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
          />
        </div>
        <div className="w-44">
          <SearchSelect value={firm} options={[{ value: "", label: "All firms" }, ...firmOptions]} recentKey="firms" placeholder="All firms" ariaLabel="Filter by firm" size="sm" onChange={setFirm} />
        </div>
        <div className="w-40">
          <SearchSelect value={stage} options={[{ value: "", label: "All stages" }, ...STAGE_OPTIONS]} placeholder="All stages" ariaLabel="Filter by stage" size="sm" onChange={setStage} />
        </div>
        <div className="w-32">
          <SearchSelect value={track} options={[{ value: "", label: "All tracks" }, ...TRACKS]} placeholder="All tracks" ariaLabel="Filter by track" size="sm" onChange={setTrack} />
        </div>
        <div className="w-36">
          <SearchSelect value={priority} options={[{ value: "", label: "Any priority" }, ...PRIORITY_OPTIONS]} placeholder="Any priority" ariaLabel="Filter by priority" size="sm" onChange={setPriority} />
        </div>
        <span className="ml-auto text-[13px] text-ink-3">
          {filtered.length} of {local.length}
        </span>
        {view !== "trash" ? (
          <>
            <Button size="sm" variant="secondary" onClick={() => setLogFor(null)}>
              Log interaction
            </Button>
            <Button size="sm" variant="primary" onClick={() => setNewOpen(true)}>
              New contact
            </Button>
          </>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-surface">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-semibold uppercase tracking-[0.06em] text-ink-3">
              <th className="w-10 px-3 py-2.5">
                <SelectCheckbox checked={sel.pageAllSelected} onToggle={() => sel.togglePage()} label="Select all on this page" />
              </th>
              <th className="px-3 py-2.5">Name</th>
              <th className="px-3 py-2.5">Firm</th>
              <th className="px-3 py-2.5">Title</th>
              <th className="px-3 py-2.5">Stage</th>
              <th className="px-3 py-2.5">Priority</th>
              <th className="px-3 py-2.5">Last contacted</th>
              <th className="px-3 py-2.5">{view === "trash" ? "Deleted" : "Next"}</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-ink-3">
                  {local.length === 0
                    ? view === "trash"
                      ? "Trash is empty."
                      : view === "network"
                        ? "No one in Network yet. LinkedIn imports land here."
                        : "No contacts yet. Add one or import your rolodex."
                    : `No contacts match “${q}”.`}
                </td>
              </tr>
            ) : grouped ? (
              grouped.map((g) => (
                <FirmGroup key={g.firmId} firmId={g.firmId} firmName={g.firmName} count={g.rows.length}>
                  {g.rows.map(renderRow)}
                </FirmGroup>
              ))
            ) : (
              shown.map(renderRow)
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > shown.length ? (
        <div className="text-center">
          <Button variant="secondary" size="sm" onClick={() => setLimit((l) => l + PAGE)}>
            Show more ({filtered.length - shown.length} left)
          </Button>
        </div>
      ) : null}

      <BulkActionBar entity="contacts" noun={["contact", "contacts"]} sel={sel} totalMatching={filtered.length} fields={fields} actions={actions} onChange={refresh} />
      <NewContactDialog open={newOpen} onClose={() => setNewOpen(false)} onSaved={refresh} />
      <LogInteractionDialog open={logFor !== undefined} contact={logFor ?? null} onClose={() => setLogFor(undefined)} onSaved={refresh} />
    </div>
  );
}

function FirmGroup({ firmId, firmName, count, children }: { firmId: string; firmName: string; count: number; children: React.ReactNode }) {
  return (
    <>
      <tr className="bg-surface-2">
        <td colSpan={9} className="px-3 py-2">
          <Link href={`/firms/${firmId}`} className="text-sm font-semibold text-ink hover:underline">
            {firmName}
          </Link>
          <span className="text-[13px] text-ink-3"> · {count} contact{count === 1 ? "" : "s"}</span>
        </td>
      </tr>
      {children}
    </>
  );
}
