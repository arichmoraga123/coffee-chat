"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Entry = {
  id: string;
  email: string;
  name: string | null;
  role: "member" | "admin";
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
type PreviewRow = { email: string; name: string | null; role: "member" | "admin"; status: "new" | "existing" | "reactivate" };
type Filter = "all" | "not-signed-up" | "inactive-14" | "deactivated";

const DAY = 86_400_000;
const INPUT = "w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-zinc-100";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-50">PE@Broad roster</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Anyone whose login email or verified .edu email is on this list joins PE@Broad automatically when they sign in.
        </p>
      </div>

      {requests.length ? (
        <section className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
          <h2 className="mb-2 text-sm font-semibold text-amber-100">Join requests ({requests.length})</h2>
          <ul className="space-y-2">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-zinc-200">
                  {r.name} <span className="text-zinc-500">· {r.eduEmail ?? r.email}</span>
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

      <section className="space-y-3 rounded-xl border border-white/10 bg-zinc-900/50 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold text-zinc-200">Add people</h2>
          <div className="flex overflow-hidden rounded-lg border border-white/10 text-xs">
            {(["outlook", "csv"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setFormat(f);
                  setPreview(null);
                }}
                className={cn("px-3 py-1.5", format === f ? "bg-[#4a6fa5] text-white" : "bg-zinc-950 text-zinc-300")}
              >
                {f === "outlook" ? "Paste from Outlook" : "CSV"}
              </button>
            ))}
          </div>
          <label className="cursor-pointer text-xs text-[#a8c0e6] hover:underline">
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
              <ul className="list-disc pl-5 text-xs text-amber-300">
                {previewErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : null}
            <div className="max-h-72 overflow-y-auto rounded-lg border border-white/10">
              <table className="w-full text-left text-xs">
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={r.email} className="border-b border-white/5">
                      <td className="px-3 py-1.5 text-zinc-200">{r.name ?? <span className="text-zinc-600">(no name)</span>}</td>
                      <td className="px-3 py-1.5 text-zinc-400">{r.email}</td>
                      <td className="px-3 py-1.5">
                        <select
                          className="rounded border border-white/10 bg-zinc-950 px-1 py-0.5"
                          value={r.role}
                          onChange={(e) => {
                            const next = [...preview];
                            next[i] = { ...r, role: e.target.value as "member" | "admin" };
                            setPreview(next);
                          }}
                        >
                          <option value="member">member</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td
                        className={cn(
                          "px-3 py-1.5",
                          r.status === "new" ? "text-emerald-300" : r.status === "reactivate" ? "text-amber-300" : "text-zinc-500",
                        )}
                      >
                        {r.status === "new" ? "new" : r.status === "reactivate" ? "reactivate" : "already on roster"}
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <button
                          type="button"
                          className="text-zinc-500 hover:text-red-300"
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
                filter === f ? "border-[#4a6fa5] bg-[#4a6fa5]/20 text-zinc-100" : "border-white/10 text-zinc-400 hover:text-zinc-200",
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
        <p className="text-xs text-zinc-500">
          {counts.signedUp} of {counts.active} active members have signed up.
        </p>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wide text-zinc-500">
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
                  <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                    Loading…
                  </td>
                </tr>
              ) : shown.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                    {entries.length ? "Nobody matches." : "The roster is empty — paste or upload it above."}
                  </td>
                </tr>
              ) : (
                shown.map((e) => {
                  const d = daysAgo(e.lastActiveAt);
                  return (
                    <tr key={e.id} className={cn("border-b border-white/5", !e.active && "opacity-50")}>
                      <td className="px-3 py-2 text-zinc-200">{e.name ?? "—"}</td>
                      <td className="px-3 py-2 text-zinc-400">{e.email}</td>
                      <td className="px-3 py-2">
                        <select
                          className="rounded border border-white/10 bg-zinc-950 px-1.5 py-0.5 text-xs"
                          value={e.role}
                          onChange={(ev) => void patch(e.id, { role: ev.target.value as Entry["role"] })}
                        >
                          <option value="member">member</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {e.signedUp ? <span className="text-emerald-300">Yes</span> : <span className="text-zinc-500">Not yet</span>}
                      </td>
                      <td className={cn("px-3 py-2 text-xs", d !== null && d >= 14 ? "text-amber-300" : "text-zinc-400")}>
                        {d === null ? "—" : d === 0 ? "Today" : `${d}d ago`}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className={e.active ? "text-red-300" : "text-emerald-300"}
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
    </div>
  );
}
