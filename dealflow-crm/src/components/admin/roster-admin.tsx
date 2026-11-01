"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BulkActionBar, SelectCheckbox, downloadCsv, useBulkSelection } from "@/components/ui/bulk";
import { Select } from "@/components/ui/select";

type Entry = {
  id: string;
  email: string;
  name: string | null;
  role: "member" | "officer" | "admin";
  active: boolean;
  signedUp: boolean;
  lastActiveAt: string | null;
};
type JoinRequest = {
  id: string;
  userId: string;
  name: string;
  email: string;
  eduEmail: string | null;
  createdAt: string;
};
type PreviewRow = { email: string; name: string | null; role: "member" | "officer" | "admin"; status: "new" | "existing" | "reactivate" };
type Filter = "all" | "not-signed-up" | "inactive-14" | "deactivated";

const DAY = 86_400_000;
const INPUT = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink";

function daysAgo(iso: string | null) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
}

export function RosterAdmin() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [format, setFormat] = useState<"outlook" | "csv">("outlook");
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/club/roster");
    if (res.ok) {
      const d = (await res.json()) as { entries: Entry[]; requests: JoinRequest[] };
      setEntries(d.entries);
      setRequests(d.requests);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const parse = async () => {
    const res = await fetch("/api/admin/club/roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "parse", format, text }),
    });
    if (!res.ok) return toast.error("Couldn't read that");
    const d = (await res.json()) as { rows: PreviewRow[]; errors: string[] };
    setPreview(d.rows);
    setPreviewErrors(d.errors);
    if (!d.rows.length) toast.message("No emails found");
  };

  const save = async () => {
    if (!preview?.length) return;
    setSaving(true);
    const res = await fetch("/api/admin/club/roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", rows: preview.map(({ email, name, role }) => ({ email, name, role })) }),
    });
    setSaving(false);
    if (!res.ok) return toast.error("Save failed");
    const d = (await res.json()) as { created: number; updated: number; linkedUsers: number };
    toast.success(`${d.created} added, ${d.updated} updated · ${d.linkedUsers} existing accounts linked`);
    setPreview(null);
    setText("");
    void load();
  };

  const patch = async (id: string, data: Partial<Pick<Entry, "role" | "active">>) => {
    const res = await fetch("/api/admin/club/roster", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    if (!res.ok) return toast.error("Update failed");
    void load();
  };

  const decide = async (id: string, decision: "approve" | "deny") => {
    const res = await fetch("/api/admin/club/join-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, decision }),
    });
    if (!res.ok) return toast.error("Couldn't update the request");
    toast.success(decision === "approve" ? "Approved — added to the roster" : "Denied");
    void load();
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setFormat("csv");
    setText(await f.text());
    setPreview(null);
  };

  const counts = useMemo(() => {
    const active = entries.filter((e) => e.active);
    return {
      active: active.length,
      signedUp: active.filter((e) => e.signedUp).length,
      notSignedUp: active.filter((e) => !e.signedUp).length,
      inactive14: active.filter((e) => e.signedUp && (daysAgo(e.lastActiveAt) ?? 0) >= 14).length,
      deactivated: entries.length - active.length,
    };
  }, [entries]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (q && !e.email.includes(q) && !(e.name ?? "").toLowerCase().includes(q)) return false;
      if (filter === "not-signed-up") return e.active && !e.signedUp;
      if (filter === "inactive-14") return e.active && e.signedUp && (daysAgo(e.lastActiveAt) ?? 0) >= 14;
      if (filter === "deactivated") return !e.active;
      return true;
    });
  }, [entries, filter, search]);
  const sel = useBulkSelection(shown.map((e) => e.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">PE@Broad roster</h1>
        <p className="mt-1 text-sm text-ink-2">
          Anyone whose login email or verified .edu email is on this list joins PE@Broad automatically when they sign in.
        </p>
      </div>

      {requests.length ? (
        <section className="rounded-xl border border-warn/40 bg-warn-bg p-4">
          <h2 className="mb-2 text-sm font-semibold text-warn">Join requests ({requests.length})</h2>
          <ul className="space-y-2">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-ink">
                  {r.name} <span className="text-ink-3">· {r.eduEmail ?? r.email}</span>
                </span>
                <span className="flex gap-2">
                  <Button size="sm" onClick={() => void decide(r.id, "approve")}>
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void decide(r.id, "deny")}>
                    Deny
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold text-ink">Add people</h2>
          <div className="flex overflow-hidden rounded-lg border border-border text-xs">
            {(["outlook", "csv"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setFormat(f);
                  setPreview(null);
                }}
                className={cn("px-3 py-1.5", format === f ? "bg-accent text-on-accent" : "bg-surface text-ink-2")}
              >
                {f === "outlook" ? "Paste from Outlook" : "CSV"}
              </button>
            ))}
          </div>
          <label className="cursor-pointer text-xs text-accent hover:underline">
            Upload CSV…
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
          </label>
        </div>
        <textarea
          className={cn(INPUT, "min-h-[120px] font-mono text-xs")}
          placeholder={
            format === "outlook"
              ? "Tuvell, Boston <tuvellbo@msu.edu>  Required  Accepted\nHsieh, Sabrina <hsiehsab@msu.edu>  Required  Accepted"
              : "email,name,role\ntuvellbo@msu.edu,Boston Tuvell,member"
          }
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPreview(null);
          }}
        />
        <Button size="sm" variant="outline" disabled={!text.trim()} onClick={() => void parse()}>
          Preview
        </Button>

        {preview ? (
          <div className="space-y-2">
            {previewErrors.length ? (
              <ul className="list-disc pl-5 text-xs text-warn">
                {previewErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : null}
            <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={r.email} className="border-b border-border">
                      <td className="px-3 py-1.5 text-ink">{r.name ?? <span className="text-ink-3">(no name)</span>}</td>
                      <td className="px-3 py-1.5 text-ink-2">{r.email}</td>
                      <td className="px-3 py-1.5">
                        <Select
                          
                          value={r.role}
                          onChange={(e) => {
                            const next = [...preview];
                            next[i] = { ...r, role: e.target.value as "member" | "admin" };
                            setPreview(next);
                          }}
                        >
                          <option value="member">member</option>
                          <option value="officer">officer</option>
                          <option value="admin">admin</option>
                        </Select>
                      </td>
                      <td
                        className={cn(
                          "px-3 py-1.5",
                          r.status === "new" ? "text-success" : r.status === "reactivate" ? "text-warn" : "text-ink-3",
                        )}
                      >
                        {r.status === "new" ? "new" : r.status === "reactivate" ? "reactivate" : "already on roster"}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <button
                          type="button"
                          className="text-ink-3 hover:text-danger"
                          onClick={() => setPreview(preview.filter((_, j) => j !== i))}
                          aria-label={`Remove ${r.email}`}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button size="sm" disabled={saving || !preview.length} onClick={() => void save()}>
              {saving ? "Saving…" : `Save ${preview.length} to roster`}
            </Button>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["all", `All (${entries.length})`],
              ["not-signed-up", `Not signed up yet (${counts.notSignedUp})`],
              ["inactive-14", `Inactive 14+ days (${counts.inactive14})`],
              ["deactivated", `Deactivated (${counts.deactivated})`],
            ] as const
          ).map(([f, label]) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs",
                filter === f ? "border-accent bg-accent-tint text-ink" : "border-border text-ink-2 hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
          <input
            className={cn(INPUT, "ml-auto w-56 py-1.5 text-xs")}
            placeholder="Search name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <p className="text-xs text-ink-3">
          {counts.signedUp} of {counts.active} active members have signed up.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-wide text-ink-3">
                <th className="w-10 px-3 py-2">
                  <SelectCheckbox checked={sel.pageAllSelected} onToggle={() => sel.togglePage()} label="Select all on roster" />
                </th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Signed up</th>
                <th className="px-3 py-2">Last active</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-ink-3">
                    Loading…
                  </td>
                </tr>
              ) : shown.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-ink-3">
                    {entries.length ? "Nobody matches." : "The roster is empty — paste or upload it above."}
                  </td>
                </tr>
              ) : (
                shown.map((e) => {
                  const d = daysAgo(e.lastActiveAt);
                  return (
                    <tr key={e.id} className={cn("border-b border-border", !e.active && "opacity-50", sel.has(e.id) && "bg-accent-tint/60")}>
                      <td className="px-3 py-2">
                        <SelectCheckbox checked={sel.has(e.id)} onToggle={(ev) => sel.toggle(e.id, ev)} label={`Select ${e.name ?? e.email}`} />
                      </td>
                      <td className="px-3 py-2 text-ink">{e.name ?? "—"}</td>
                      <td className="px-3 py-2 text-ink-2">{e.email}</td>
                      <td className="px-3 py-2">
                        <Select
                          
                          value={e.role}
                          onChange={(ev) => void patch(e.id, { role: ev.target.value as Entry["role"] })}
                        >
                          <option value="member">member</option>
                          <option value="officer">officer</option>
                          <option value="admin">admin</option>
                        </Select>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {e.signedUp ? <span className="text-success">Yes</span> : <span className="text-ink-3">Not yet</span>}
                      </td>
                      <td className={cn("px-3 py-2 text-xs", d !== null && d >= 14 ? "text-warn" : "text-ink-2")}>
                        {d === null ? "—" : d === 0 ? "Today" : `${d}d ago`}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className={e.active ? "text-danger" : "text-success"}
                          onClick={() => {
                            if (e.active && !confirm(`Deactivate ${e.name ?? e.email}? Their account and data are kept.`)) return;
                            void patch(e.id, { active: !e.active });
                          }}
                        >
                          {e.active ? "Deactivate" : "Reactivate"}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
      <BulkActionBar
        entity="roster"
        noun={["member", "members"]}
        sel={sel}
        fields={[{ key: "role", label: "Role", type: "select", options: [{ value: "member", label: "Member" }, { value: "officer", label: "Officer (can post to the club)" }, { value: "admin", label: "Admin" }] }]}
        actions={[
          { key: "deactivate", label: "Deactivate" },
          { key: "reactivate", label: "Reactivate" },
          { key: "export", label: "Export CSV", client: (ids) => downloadCsv("roster.csv", ["email", "name", "role", "active"], entries.filter((x) => ids.includes(x.id)).map((x) => [x.email, x.name, x.role, x.active ? "yes" : "no"])) },
        ]}
        onChange={() => void load()}
      />
    </div>
  );
}
