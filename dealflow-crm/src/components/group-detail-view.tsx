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
type Group = {
  id: string;
  name: string;
  members: Member[];
  messages: Msg[];
};

export function GroupDetailView({ groupId }: { groupId: string }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => {
    const res = await fetch(`/api/study-groups/${groupId}`);
    if (!res.ok) return;
    const d = (await res.json()) as { group: Group };
    setGroup(d.group);
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

  if (!group) return <p className="text-zinc-500">Loading…</p>;

  const sorted = [...group.members].sort((a, b) => b.user.weeklyXP - a.user.weeklyXP);

  return (
    <div className="space-y-4">
      <Link href="/groups" className="text-xs text-[#888888] underline-offset-4 hover:text-[#f0f0f0] hover:underline">
        ← Groups
      </Link>
      <h1 className="text-xl font-semibold">{group.name}</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3 border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm font-medium text-zinc-200">Members &amp; stats</p>
          <ul className="space-y-2 text-sm">
            {sorted.map((m) => (
              <li key={m.user.id} className="flex justify-between gap-2 border-b border-zinc-800/80 py-1">
                <span>
                  {m.user.name} <span className="text-xs text-zinc-500">({m.role})</span>
                </span>
                <span className="text-xs text-zinc-400">
                  streak {m.user.drillStreak} · wk XP {m.user.weeklyXP} · XP {m.user.xp}
                </span>
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
        <Card className="space-y-2 border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm font-medium text-zinc-200">Group board</p>
          <div className="max-h-72 space-y-2 overflow-y-auto text-sm">
            {group.messages.map((m) => (
              <div key={m.id} className="rounded bg-zinc-950/80 px-2 py-1">
                <span className="text-xs text-[#4a6fa5]">{m.user.name}</span>
                <p className="text-zinc-300">{m.body}</p>
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
