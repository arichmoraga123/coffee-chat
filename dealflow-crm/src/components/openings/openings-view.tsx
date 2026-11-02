"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, Check, ExternalLink, Plus, Search, Upload, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchSelect } from "@/components/ui/search-select";
import { DataTable, Td, Th } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { BulkActionBar, InlineEdit, SelectCheckbox, useBulkSelection } from "@/components/ui/bulk";
import { STAGE_LABELS } from "@/lib/constants";
import { CLASS_YEARS, DEADLINE_TYPES, OPENING_STATUSES, OPENING_TRACKS, ROLE_TYPES, daysUntil, easternToday } from "@/lib/openings";
import type { OpeningRow } from "@/lib/openings-data";
import { cn } from "@/lib/utils";

const ALL = "all";
const OPEN_OR_SOON = "open+soon";
const STATUS_TONE: Record<string, BadgeTone> = { Open: "success", "Not yet open": "info", Closed: "neutral", Unknown: "warn" };
const opt = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));
const shortDate = (d: string | null) => (d ? new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : null);

/** Deadline order: soonest first, then Rolling, then Unknown. */
function sortKey(r: OpeningRow): [number, string] {
  if (r.deadline) return [0, r.deadline];
  return [r.deadlineType === "Rolling" ? 1 : 2, r.firmName.toLowerCase()];
}

export function OpeningsView({
  rows: initialRows,
  canEdit,
  defaults,
}: {
  rows: OpeningRow[];
  canEdit: boolean;
  defaults: { classYear: string | null; track: string | null; q?: string };
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  // Server refreshes (after edits, uploads) replace the local copy.
  useEffect(() => setRows(initialRows), [initialRows]);
  const [q, setQ] = useState(defaults.q ?? "");
  const [track, setTrack] = useState(defaults.track && initialRows.some((r) => r.track === defaults.track) ? defaults.track : ALL);
  const [roleType, setRoleType] = useState(ALL);
  const [classYear, setClassYear] = useState(defaults.classYear ?? ALL);
  const [city, setCity] = useState(ALL);
  const [firm, setFirm] = useState(ALL);
  const [status, setStatus] = useState(OPEN_OR_SOON);
  const [summer, setSummer] = useState(ALL);
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const today = easternToday();

  const patch = (id: string, p: Partial<OpeningRow>) => setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const choices = useMemo(() => {
    const uniq = (xs: (string | number | null)[]) => [...new Set(xs.filter((x): x is string | number => x !== null && x !== ""))].map(String).sort();
    return { cities: uniq(rows.map((r) => r.city)), firms: uniq(rows.map((r) => r.firmName)), summers: uniq(rows.map((r) => r.recruitingSummer)) };
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => (showArchived ? r.archived : !r.archived))
      .filter((r) => track === ALL || r.track === track)
      .filter((r) => roleType === ALL || r.roleType === roleType)
      .filter((r) => classYear === ALL || r.classYears.length === 0 || r.classYears.includes(classYear))
      .filter((r) => city === ALL || r.city === city)
      .filter((r) => firm === ALL || r.firmName === firm)
      .filter((r) => summer === ALL || String(r.recruitingSummer) === summer)
      .filter((r) => (status === ALL ? true : status === OPEN_OR_SOON ? r.status === "Open" || r.status === "Not yet open" : r.status === status))
      .filter((r) => !needle || `${r.firmName} ${r.program} ${r.city} ${r.group ?? ""} ${r.track ?? ""} ${r.notes ?? ""}`.toLowerCase().includes(needle))
      .sort((a, b) => {
        const [ka, va] = sortKey(a);
        const [kb, vb] = sortKey(b);
        return ka - kb || va.localeCompare(vb) || a.firmName.localeCompare(b.firmName);
      });
  }, [rows, q, track, roleType, classYear, city, firm, summer, status, showArchived]);

  const sel = useBulkSelection(filtered.map((r) => r.id));
  const filtersOn = [track, roleType, classYear, city, firm, summer].some((v) => v !== ALL) || status !== OPEN_OR_SOON || q;

  const pipeline = async (r: OpeningRow, action: "add" | "applied") => {
    setBusy(`${r.id}:${action}`);
    try {
      const res = await fetch(`/api/openings/${r.id}/pipeline`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const d = (await res.json().catch(() => ({}))) as { pipeline?: { id: string; stage: string }; error?: string };
      if (!res.ok || !d.pipeline) throw new Error(d.error ?? "That didn't work.");
      patch(r.id, { pipeline: d.pipeline });
      toast.success(action === "applied" ? `Marked applied · ${r.firmName}` : `Added to your pipeline · ${r.firmName}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const remind = async (r: OpeningRow, on: boolean, days = 7) => {
    setBusy(`${r.id}:remind`);
    try {
      const res = on
        ? await fetch(`/api/openings/${r.id}/reminder`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ remindOpen: true, remindDaysBefore: days }) })
        : await fetch(`/api/openings/${r.id}/reminder`, { method: "DELETE" });
      if (!res.ok) throw new Error("That didn't work.");
      patch(r.id, { reminder: on ? { remindOpen: true, remindDaysBefore: days } : null });
      toast.success(on ? `We'll remind you ${r.status === "Not yet open" ? "when it opens and " : ""}${days} days before the deadline.` : "Reminder off");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const resetFilters = () => {
    setQ("");
    setTrack(ALL);
    setRoleType(ALL);
    setClassYear(ALL);
    setCity(ALL);
    setFirm(ALL);
    setSummer(ALL);
    setStatus(OPEN_OR_SOON);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Openings"
        subtitle={
          <>
            Application openings collected by PE@Broad. Add them to your pipeline and get deadline reminders.{" "}
            <Link href="/stories/group-finder" className="text-accent hover:underline">
              Not sure which group? Try the Group Finder
            </Link>
          </>
        }
        actions={
          canEdit ? (
            <Button variant="primary" asChild>
              <Link href="/recruiting/openings/upload">
                <Upload className="h-4 w-4" aria-hidden /> Upload
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="space-y-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search firm, program, city, group" className="pl-9" aria-label="Search openings" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Filter label="Class year" value={classYear} onChange={setClassYear} options={opt(CLASS_YEARS)} allLabel="Any class year" />
          <Filter label="Track" value={track} onChange={setTrack} options={opt(OPENING_TRACKS)} allLabel="All tracks" />
          <Filter label="Role type" value={roleType} onChange={setRoleType} options={opt(ROLE_TYPES)} allLabel="All role types" />
          <Filter
            label="Status"
            value={status}
            onChange={setStatus}
            options={[{ value: OPEN_OR_SOON, label: "Open or not yet open" }, ...opt(OPENING_STATUSES), { value: "Unknown", label: "Unknown" }]}
            allLabel="Any status"
          />
          <Filter label="City" value={city} onChange={setCity} options={opt(choices.cities)} allLabel="All cities" />
          <Filter label="Firm" value={firm} onChange={setFirm} options={opt(choices.firms)} allLabel="All firms" />
          <Filter label="Recruiting summer" value={summer} onChange={setSummer} options={opt(choices.summers)} allLabel="Any summer" />
          <div className="flex items-end gap-3">
            {filtersOn ? (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Reset filters
              </Button>
            ) : null}
            {canEdit ? (
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 text-sm text-ink-2">
                <input type="checkbox" className="h-4 w-4 accent-[var(--color-accent)]" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
                Archived
              </label>
            ) : null}
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No openings yet"
          description={canEdit ? "Upload the openings template to get started." : "Officers will post application openings here. Check back soon."}
        />
      ) : (
        <>
          <p className="text-[13px] text-ink-3">
            {filtered.length} of {rows.filter((r) => !r.archived).length} openings
          </p>
          <DataTable minWidth={canEdit ? 900 : 860}>
            <thead>
              <tr>
                {canEdit ? (
                  <Th className="w-10">
                    <SelectCheckbox checked={sel.pageAllSelected} onToggle={() => sel.togglePage()} label="Select all" />
                  </Th>
                ) : null}
                <Th className="w-[150px] px-3">Firm</Th>
                <Th className="px-3">Program</Th>
                <Th className="w-[110px] px-3">City</Th>
                <Th className="w-[150px] px-3">Dates</Th>
                <Th className="w-[120px] px-3">Status</Th>
                <Th className="w-[190px] px-3">Apply &amp; plan</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const d = r.deadline ? daysUntil(r.deadline, today) : null;
                const soon = d !== null && d >= 0 && d <= 7;
                return (
                  <tr key={r.id} data-opening-id={r.id} className={cn("align-top", sel.has(r.id) && "bg-accent-tint")}>
                    {canEdit ? (
                      <Td>
                        <SelectCheckbox checked={sel.has(r.id)} onToggle={(e) => sel.toggle(r.id, e)} label={`Select ${r.firmName} ${r.program}`} />
                      </Td>
                    ) : null}
                    <Td className="px-3 font-medium">
                      {r.myFirmId ? (
                        <Link href={`/firms/${r.myFirmId}`} className="break-words hover:underline">
                          {r.firmName}
                        </Link>
                      ) : (
                        <span className="break-words">{r.firmName}</span>
                      )}
                      {r.knownContacts > 0 && r.myFirmId ? (
                        <Link href={`/firms/${r.myFirmId}`} className="mt-1 flex items-center gap-1 text-[12px] font-normal text-accent hover:underline">
                          <Users className="h-3.5 w-3.5" aria-hidden /> You know {r.knownContacts} {r.knownContacts === 1 ? "person" : "people"} here
                        </Link>
                      ) : null}
                    </Td>
                    <Td className="px-3">
                      <p className="break-words">{r.program}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1 text-[12px] text-ink-3">
                        {canEdit ? (
                          <InlineEdit entity="openings" id={r.id} field="roleType" type="select" options={opt(ROLE_TYPES)} value={r.roleType ?? ""} display={r.roleType ?? "Role type"} ariaLabel={`role type for ${r.program}`} onSaved={(v) => patch(r.id, { roleType: v || null })} />
                        ) : r.roleType ? (
                          <span>{r.roleType}</span>
                        ) : null}
                        <span aria-hidden>·</span>
                        {canEdit ? (
                          <InlineEdit entity="openings" id={r.id} field="track" type="select" options={opt(OPENING_TRACKS)} value={r.track ?? ""} display={r.track ?? "Track"} ariaLabel={`track for ${r.program}`} onSaved={(v) => patch(r.id, { track: v || null })} />
                        ) : r.track ? (
                          <span>{r.track}</span>
                        ) : null}
                        {r.classYears.length ? <span>· {r.classYears.join(", ")}</span> : null}
                        {r.group ? <span>· {r.group}</span> : null}
                      </div>
                      {r.notes ? <p className="mt-1 text-[12px] text-ink-3">{r.notes}</p> : null}
                    </Td>
                    <Td className="px-3">{r.city}</Td>
                    <Td className="whitespace-nowrap px-3 text-[13px] text-ink-2">
                      <span className="text-ink-3">Opens </span>
                      {canEdit ? (
                        <InlineEdit entity="openings" id={r.id} field="opensOn" type="date" value={r.opensOn ?? ""} display={shortDate(r.opensOn) ?? "—"} ariaLabel={`opens on for ${r.program}`} onSaved={(v) => (patch(r.id, { opensOn: v || null }), router.refresh())} />
                      ) : (
                        (shortDate(r.opensOn) ?? "—")
                      )}
                      <div className="mt-1 text-ink">
                      <span className="text-ink-3">Due </span>
                      {canEdit ? (
                        <InlineEdit entity="openings" id={r.id} field="deadline" type="date" value={r.deadline ?? ""} display={shortDate(r.deadline) ?? r.deadlineType} ariaLabel={`deadline for ${r.program}`} onSaved={(v) => (patch(r.id, { deadline: v || null }), router.refresh())} />
                      ) : (
                        <span>{shortDate(r.deadline) ?? r.deadlineType}</span>
                      )}
                      </div>
                      {d !== null && d >= 0 ? <p className={cn("text-[12px]", soon ? "font-medium text-warn" : "text-ink-3")}>{d === 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`}</p> : null}
                    </Td>
                    <Td className="px-3">
                      {canEdit ? (
                        <InlineEdit
                          entity="openings"
                          id={r.id}
                          field="statusOverride"
                          type="select"
                          options={[{ value: "", label: "Automatic (from dates)" }, ...opt(OPENING_STATUSES)]}
                          value={r.statusOverride ?? ""}
                          display={<Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>}
                          ariaLabel={`status for ${r.program}`}
                          onSaved={() => router.refresh()}
                        />
                      ) : (
                        <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                      )}
                    </Td>
                    <Td className="px-3">
                      <div className="flex flex-col items-start gap-1.5">
                        {r.link ? (
                          <a href={r.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
                            Apply <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          </a>
                        ) : null}
                        {r.pipeline ? (
                          <Link href="/pipeline" className="inline-flex items-center gap-1 text-[13px] font-medium text-success hover:underline">
                            <Check className="h-3.5 w-3.5" aria-hidden /> In your pipeline · {STAGE_LABELS[r.pipeline.stage as keyof typeof STAGE_LABELS] ?? r.pipeline.stage}
                          </Link>
                        ) : (
                          <Button size="sm" variant="secondary" disabled={busy === `${r.id}:add`} onClick={() => void pipeline(r, "add")}>
                            <Plus className="h-3.5 w-3.5" aria-hidden /> Add to pipeline
                          </Button>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {!r.pipeline || r.pipeline.stage === "TARGET" ? (
                            <Button size="sm" variant="ghost" disabled={busy === `${r.id}:applied`} onClick={() => void pipeline(r, "applied")}>
                              Mark applied
                            </Button>
                          ) : null}
                          {r.reminder ? (
                            <Button size="sm" variant="ghost" disabled={busy === `${r.id}:remind`} onClick={() => void remind(r, false)} title="Stop reminding me">
                              <BellOff className="h-3.5 w-3.5" aria-hidden /> Reminding · {r.reminder.remindDaysBefore}d
                            </Button>
                          ) : r.status !== "Closed" ? (
                            <Button size="sm" variant="ghost" disabled={busy === `${r.id}:remind`} onClick={() => void remind(r, true)}>
                              <Bell className="h-3.5 w-3.5" aria-hidden /> Remind me
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </Td>
                  </tr>
                );
              })}
              {!filtered.length ? (
                <tr>
                  <Td colSpan={canEdit ? 7 : 6} className="py-10 text-center text-ink-3">
                    No openings match these filters.{" "}
                    <button type="button" onClick={resetFilters} className="text-accent hover:underline">
                      Reset filters
                    </button>
                  </Td>
                </tr>
              ) : null}
            </tbody>
          </DataTable>
        </>
      )}

      {canEdit ? (
        <BulkActionBar
          entity="openings"
          noun={["opening", "openings"]}
          sel={sel}
          fields={[
            { key: "track", label: "Track", type: "select", options: opt(OPENING_TRACKS) },
            { key: "classYears", label: "Class years", type: "tags", options: opt(CLASS_YEARS) },
            { key: "statusOverride", label: "Status", type: "select", options: [{ value: "", label: "Automatic (from dates)" }, ...opt(OPENING_STATUSES)] },
            { key: "roleType", label: "Role type", type: "select", options: opt(ROLE_TYPES) },
            { key: "deadlineType", label: "Deadline type", type: "select", options: opt(DEADLINE_TYPES) },
            { key: "deadline", label: "Deadline", type: "date" },
          ]}
          actions={showArchived ? [{ key: "unarchive", label: "Restore" }] : [{ key: "archive", label: "Archive", confirm: (n) => `Archive ${n} opening${n === 1 ? "" : "s"}? Members won't see them.` }]}
          onChange={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <span className="eyebrow block">{label}</span>
      <SearchSelect ariaLabel={label} value={value} onChange={(v) => onChange(v || ALL)} options={[{ value: ALL, label: allLabel }, ...options]} />
    </div>
  );
}
