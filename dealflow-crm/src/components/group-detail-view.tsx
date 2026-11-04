"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Member = {
  role: string;
  user: { id: string; name: string; email: string; drillStreak: number; weeklyXP: number; xp: number };
};
type Msg = { id: string; body: string; createdAt: string; user: { name: string } };
type SharedPitch = {
  id: string;
  companyName: string;
  recommendation: string;
  user: { name: string };
};
type Group = {
  id: string;
  name: string;
  members: Member[];
  messages: Msg[];
  sharedPitches: SharedPitch[];
};

export function GroupDetailView({ groupId }: { groupId: string }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => {
    const res = await fetch(`/api/study-groups/${groupId}`);
    if (!res.ok) return;
    const d = (await res.json()) as { group: Group };
    setGroup({ ...d.group, sharedPitches: d.group.sharedPitches ?? [] });
  };

  useEffect(() => {
    void load();
  }, [groupId]);

  const invite = async () => {
    const res = await fetch(`/api/study-groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    const d = await res.json();
    if (!res.ok) {
      alert((d as { error?: string }).error ?? "Failed");
      return;
    }
    setInviteEmail("");
    void load();
  };

  const send = async () => {
    if (!msg.trim()) return;
    await fetch(`/api/study-groups/${groupId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: msg.trim() }),
    });
    setMsg("");
    void load();
  };

  if (!group) return <p className="text-ink-3">Loading…</p>;

  const sorted = [...group.members].sort((a, b) => b.user.weeklyXP - a.user.weeklyXP);

  return (
    <div className="space-y-4">
      <h2 className="section-title">Group space</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 border-border bg-surface p-4">
          <p className="text-sm font-medium text-ink">Members</p>
          <ul className="space-y-2 text-sm">
            {sorted.map((m) => (
              <li key={m.user.id} className="flex justify-between gap-2 border-b border-border py-1">
                <span>
                  {m.user.name} {m.role === "admin" ? <span className="text-xs text-ink-3">(captain)</span> : null}
                </span>
                <span className="text-xs text-ink-2">{m.user.drillStreak ? `${m.user.drillStreak}-day streak` : ""}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 pt-2">
            <Input placeholder="Invite by email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            <Button size="sm" onClick={() => void invite()}>
              Invite
            </Button>
          </div>
        </Card>
        <Card className="space-y-2 border-border bg-surface p-4">
          <p className="text-sm font-medium text-ink">Shared stock pitches</p>
          {group.sharedPitches?.length ? (
            <ul className="space-y-2 text-sm text-ink-2">
              {group.sharedPitches.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-1 last:border-0">
                  <span>
                    {p.companyName} · <span className="text-ink-3">{p.recommendation}</span>{" "}
                    <span className="text-xs text-ink-3">by {p.user.name}</span>
                  </span>
                  <Link
                    href={`/pitch-builder?view=${encodeURIComponent(p.id)}`}
                    className="text-xs text-accent underline-offset-2 hover:underline"
                  >
                    Open in Pitch Builder
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-ink-3">No pitches shared yet.</p>
          )}
        </Card>
        <Card className="space-y-2 border-border bg-surface p-4">
          <p className="text-sm font-medium text-ink">Group chat</p>
          <div className="max-h-72 space-y-2 overflow-y-auto text-sm">
            {group.messages.map((m) => (
              <div key={m.id} className="rounded bg-surface px-2 py-1">
                <span className="text-xs text-accent">{m.user.name}</span>
                <p className="text-ink-2">{m.body}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Post a note…" />
            <Button size="sm" onClick={() => void send()}>
              Send
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
