"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge, Chip } from "@/components/ui/badge";
import { DataTable, Td, Th } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type M = {
  id: string;
  role: string;
  name: string;
  email?: string;
  careerTracks: string[];
};

const ROLE_LABEL: Record<string, string> = { admin: "Admin", president: "President", vp: "VP", sector_head: "Sector head", member: "Member" };

export function ClubMembersFilter({ members }: { members: M[] }) {
  const [q, setQ] = useState("");
  const [trackQ, setTrackQ] = useState("");

  const tracks = useMemo(() => {
    const s = new Set<string>();
    for (const m of members) for (const t of m.careerTracks) s.add(t);
    return Array.from(s).sort();
  }, [members]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return members.filter((m) => {
      if (trackQ && !m.careerTracks.includes(trackQ)) return false;
      if (term && !m.name.toLowerCase().includes(term) && !(m.email ?? "").toLowerCase().includes(term)) return false;
      return true;
    });
  }, [members, q, trackQ]);

  const showEmail = members.some((m) => m.email);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members" className="w-full sm:w-64" aria-label="Search members" />
        <Select value={trackQ} onChange={(e) => setTrackQ(e.target.value)} aria-label="Track">
          <option value="">All tracks</option>
          {tracks.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <span className="ml-auto self-center text-[13px] text-ink-3">
          {filtered.length} of {members.length}
        </span>
      </div>

      <DataTable minWidth={480}>
        <thead>
          <tr>
            <Th>Member</Th>
            <Th>Tracks</Th>
            {showEmail ? <Th>Email</Th> : null}
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <Td colSpan={3} className="py-8 text-center text-ink-3">
                No members match.
              </Td>
            </tr>
          ) : (
            filtered.map((m) => (
              <tr key={m.id}>
                <Td>
                  <span className="flex items-center gap-3">
                    <Avatar name={m.name} size={32} />
                    <span className="min-w-0">
                      <span className="block font-medium text-ink">{m.name}</span>
                      {m.role !== "member" ? (
                        <Badge tone="accent" className="mt-0.5">
                          {ROLE_LABEL[m.role] ?? m.role}
                        </Badge>
                      ) : null}
                    </span>
                  </span>
                </Td>
                <Td>
                  <span className="flex flex-wrap gap-1">
                    {m.careerTracks.length ? m.careerTracks.map((t) => <Chip key={t}>{t}</Chip>) : <span className="text-ink-3">—</span>}
                  </span>
                </Td>
                {showEmail ? <Td className="text-ink-2">{m.email ?? "—"}</Td> : null}
              </tr>
            ))
          )}
        </tbody>
      </DataTable>
    </div>
  );
}
