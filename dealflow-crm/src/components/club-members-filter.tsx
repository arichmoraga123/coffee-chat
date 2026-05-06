"use client";

import { useMemo, useState } from "react";

type M = {
  id: string;
  role: string;
  name: string;
  email?: string;
  careerTracks: string[];
};

export function ClubMembersFilter({ members }: { members: M[] }) {
  const [roleQ, setRoleQ] = useState("");
  const [trackQ, setTrackQ] = useState("");

  const roles = useMemo(() => Array.from(new Set(members.map((m) => m.role))).sort(), [members]);
  const tracks = useMemo(() => {
    const s = new Set<string>();
    for (const m of members) for (const t of m.careerTracks) s.add(t);
    return Array.from(s).sort();
  }, [members]);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (roleQ && m.role !== roleQ) return false;
      if (trackQ && !m.careerTracks.includes(trackQ)) return false;
      return true;
    });
  }, [members, roleQ, trackQ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select
          className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200"
          value={roleQ}
          onChange={(e) => setRoleQ(e.target.value)}
        >
          <option value="">All roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-200"
          value={trackQ}
          onChange={(e) => setTrackQ(e.target.value)}
        >
          <option value="">All tracks</option>
          {tracks.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[320px] text-left text-sm">
          <thead className="border-b border-zinc-800 bg-zinc-900/80 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Tracks</th>
              <th className="px-3 py-2">Contact</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-b border-zinc-800/80 last:border-0">
                <td className="px-3 py-2 font-medium text-zinc-100">{m.name}</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">{m.role}</span>
                </td>
                <td className="px-3 py-2 text-xs text-zinc-400">{m.careerTracks.join(", ") || "—"}</td>
                <td className="px-3 py-2 text-xs text-zinc-400">{m.email ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 ? <p className="text-sm text-zinc-500">No members match filters.</p> : null}
    </div>
  );
}
