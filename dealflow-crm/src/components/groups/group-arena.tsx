"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Crown, Flame, Swords, Trophy } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SearchSelect } from "@/components/ui/search-select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { DataTable, Td, Th } from "@/components/ui/data-table";
import { LevelBadge } from "@/components/groups/groups-hub";
import { MAX_TEAM, POINTS, TEAM_TOP, type MemberPoints } from "@/lib/group-points-rules";
import type { DuelView, LeagueRow } from "@/lib/group-competition";
import { cn } from "@/lib/utils";

type Props = {
  group: { id: string; name: string; description: string | null; visibility: string; joinCode: string | null; members: number };
  viewer: { isMember: boolean; isCaptain: boolean; isTeam: boolean; hasTeam: boolean };
  row: LeagueRow | null;
  opponents: { id: string; name: string; rank: number; teamSize: number }[];
  contributions: { id: string; name: string; points: MemberPoints }[];
  duels: DuelView[];
  roster: { id: string; name: string; captain: boolean; onTeam: boolean }[];
};

async function call(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(d.error ?? "That didn't work.");
  return d;
}

export function GroupArena({ group, viewer, row, opponents, contributions, duels, roster }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const live = duels.filter((d) => d.status === "active");
  const incoming = duels.filter((d) => d.status === "pending" && d.opponent.groupId === group.id);
  const outgoing = duels.filter((d) => d.status === "pending" && d.challenger.groupId === group.id);
  const history = duels.filter((d) => d.status === "finished");
  const busyWith = new Set(duels.filter((d) => d.status === "active" || d.status === "pending").flatMap((d) => [d.challenger.groupId, d.opponent.groupId]));

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Study groups", href: "/groups" }, { label: group.name }]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {group.name}
            {row ? <LevelBadge level={row.level} /> : null}
            {viewer.isTeam ? <Badge tone="accent">Your team</Badge> : null}
          </span>
        }
        subtitle={group.description ?? (group.visibility === "open" ? "Open group — anyone can join." : "Invite-only group.")}
        sectionTabs={false}
        actions={
          !viewer.isMember ? (
            group.visibility === "open" ? (
              <Button variant="primary" disabled={busy} onClick={() => void run(() => call("/api/study-groups/join", { groupId: group.id }), `Joined ${group.name}`)}>
                Join group
              </Button>
            ) : null
          ) : (
            <>
              {!viewer.isTeam ? (
                <Button variant="primary" disabled={busy} onClick={() => void run(() => call(`/api/study-groups/${group.id}/team`, {}), "This is now your team")}>
                  {viewer.hasTeam ? "Switch to this team" : "Make this my team"}
                </Button>
              ) : null}
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  if (!window.confirm(`Leave ${group.name}?`)) return;
                  void run(async () => {
                    await call(`/api/study-groups/${group.id}/leave`, {});
                    router.push("/groups");
                  }, "Left the group");
                }}
              >
                Leave
              </Button>
            </>
          )
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="This week" value={row ? row.week.toLocaleString() : "0"} sub={row ? `#${row.rank} in the league` : "No team members yet"} icon={<Trophy className="h-4 w-4 text-ink-3" aria-hidden />} />
        <Tile label="Record" value={row ? `${row.record.w}–${row.record.l}${row.record.t ? `–${row.record.t}` : ""}` : "0–0"} sub="duels won–lost" icon={<Swords className="h-4 w-4 text-ink-3" aria-hidden />} />
        <Tile label="Streak" value={String(row?.streak ?? 0)} sub="weeks at 100+ points" icon={<Flame className={cn("h-4 w-4", row?.streak ? "text-warn" : "text-ink-3")} aria-hidden />} />
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Level</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{row?.level.name ?? "Bronze"}</p>
          <ProgressBar value={(row?.level.progress ?? 0) * 100} className="mt-2" />
          <p className="mt-1 text-[11px] text-ink-3">
            {row?.level.next ? `${(row.level.next.min - row.season).toLocaleString()} to ${row.level.next.name}` : row ? "Top level" : "Earn points to level up"}
          </p>
        </div>
      </div>

      {/* Live duels */}
      {live.map((d) => (
        <DuelBoard key={d.id} duel={d} home={group.id} />
      ))}

      {/* Challenges waiting */}
      {incoming.map((d) => (
        <Card key={d.id}>
          <div className="flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="text-sm text-ink">
              <Swords className="mr-1 inline h-4 w-4 text-accent" aria-hidden />
              <span className="font-semibold">{d.challenger.name}</span> challenged you to a {d.durationDays}-day duel.
            </p>
            {viewer.isCaptain ? (
              <div className="flex gap-2">
                <Button size="sm" variant="primary" disabled={busy} onClick={() => void run(() => call(`/api/group-duels/${d.id}`, { action: "accept" }), "Duel on!")}>
                  Accept
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => void run(() => call(`/api/group-duels/${d.id}`, { action: "decline" }), "Declined")}>
                  Decline
                </Button>
              </div>
            ) : (
              <p className="text-[13px] text-ink-3">Waiting for your captain to accept.</p>
            )}
          </div>
        </Card>
      ))}
      {outgoing.map((d) => (
        <Card key={d.id}>
          <div className="flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="text-sm text-ink-2">
              Waiting for <span className="font-semibold text-ink">{d.opponent.name}</span> to accept your {d.durationDays}-day duel (48 hours to answer).
            </p>
            {viewer.isCaptain ? (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => void run(() => call(`/api/group-duels/${d.id}`, { action: "cancel" }), "Challenge cancelled")}>
                Cancel
              </Button>
            ) : null}
          </div>
        </Card>
      ))}

      {viewer.isCaptain ? <ChallengeForm groupId={group.id} opponents={opponents.filter((o) => !busyWith.has(o.id))} onDone={() => router.refresh()} /> : null}

      {/* This week */}
      <Card title="This week's points" action={<span className="text-ink-3">Best {TEAM_TOP} count toward the league</span>}>
        {contributions.length ? (
          <DataTable minWidth={560}>
            <thead>
              <tr>
                <Th>Member</Th>
                <Th className="text-right">Lessons</Th>
                <Th className="text-right">Correct</Th>
                <Th className="text-right">Daily sets</Th>
                <Th className="text-right">Challenges</Th>
                <Th className="text-right">Points</Th>
              </tr>
            </thead>
            <tbody>
              {contributions.map((c, i) => (
                <tr key={c.id}>
                  <Td className="font-medium">
                    {c.name}
                    {i < TEAM_TOP && c.points.total > 0 ? <span className="ml-2 text-[11px] font-normal text-accent">counts</span> : null}
                  </Td>
                  <Td className="text-right tabular-nums">{c.points.byKind.lesson / POINTS.lesson}</Td>
                  <Td className="text-right tabular-nums">{c.points.byKind.correct / POINTS.correct}</Td>
                  <Td className="text-right tabular-nums">{c.points.byKind.dailySet / POINTS.dailySet}</Td>
                  <Td className="text-right tabular-nums">{c.points.byKind.challenge / POINTS.challenge}</Td>
                  <Td className="text-right font-semibold tabular-nums">{c.points.total}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <p className="text-sm text-ink-3">Nobody has made this group their team yet.</p>
        )}
        {viewer.isMember ? (
          <p className="mt-3 text-[12px] text-ink-3">
            {roster.filter((r) => !r.onTeam).length
              ? `In the group but earning points for another team: ${roster.filter((r) => !r.onTeam).map((r) => r.name).join(", ")}.`
              : `Team: ${contributions.length}/${MAX_TEAM}.`}
          </p>
        ) : null}
      </Card>

      {history.length ? (
        <Card title="Past duels">
          <ul className="divide-y divide-border text-sm">
            {history.map((d) => {
              const home = d.challenger.groupId === group.id ? d.challenger : d.opponent;
              const away = home === d.challenger ? d.opponent : d.challenger;
              const result = !d.winnerId ? "Tie" : d.winnerId === group.id ? "Won" : "Lost";
              return (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span>
                    <Badge tone={result === "Won" ? "success" : result === "Lost" ? "danger" : "neutral"}>{result}</Badge>{" "}
                    <span className="ml-1">
                      vs{" "}
                      <Link href={`/groups/${away.groupId}`} className="font-medium hover:underline">
                        {away.name}
                      </Link>
                    </span>
                  </span>
                  <span className="tabular-nums text-ink-2">
                    {home.score} – {away.score}
                    <span className="ml-2 text-[12px] text-ink-3">{d.endsAt ? new Date(d.endsAt).toLocaleDateString() : ""}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      {viewer.isCaptain ? <CaptainSettings group={group} roster={roster} onDone={() => router.refresh()} /> : viewer.isMember && group.joinCode ? <InviteCode code={group.joinCode} /> : null}
    </div>
  );
}

function Tile({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">
        {icon} {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      <p className="text-[11px] text-ink-3">{sub}</p>
    </div>
  );
}

function useCountdown(endsAt: string | null) {
  const [now, setNow] = useState(() => new Date().getTime());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date().getTime()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  if (!endsAt) return "";
  const ms = new Date(endsAt).getTime() - now;
  if (ms <= 0) return "Final scores coming in";
  const h = Math.floor(ms / 3_600_000);
  return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h left` : `${h}h ${Math.floor((ms % 3_600_000) / 60_000)}m left`;
}

function DuelBoard({ duel, home }: { duel: DuelView; home: string }) {
  const left = duel.challenger.groupId === home ? duel.challenger : duel.opponent;
  const right = left === duel.challenger ? duel.opponent : duel.challenger;
  const countdown = useCountdown(duel.endsAt);
  const total = Math.max(1, left.score + right.score);
  const leading = left.score === right.score ? null : left.score > right.score ? left : right;
  return (
    <Card>
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-accent">
            <Swords className="h-4 w-4" aria-hidden /> Live duel · {duel.durationDays} days
          </p>
          <p className="text-[13px] text-ink-3">{countdown}</p>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{left.name}</p>
            <p className="text-4xl font-semibold tabular-nums text-ink">{left.score}</p>
          </div>
          <p className="text-sm font-semibold text-ink-3">vs</p>
          <div className="min-w-0 text-right">
            <p className="truncate font-semibold text-ink">
              <Link href={`/groups/${right.groupId}`} className="hover:underline">
                {right.name}
              </Link>
            </p>
            <p className="text-4xl font-semibold tabular-nums text-ink">{right.score}</p>
          </div>
        </div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
          <div className="bg-accent transition-[width]" style={{ width: `${(left.score / total) * 100}%` }} />
          <div className="bg-warn transition-[width]" style={{ width: `${(right.score / total) * 100}%` }} />
        </div>
        <p className="text-center text-[13px] text-ink-2">
          {leading ? (
            <>
              <Crown className="mr-1 inline h-4 w-4 text-warn" aria-hidden />
              {leading.name} leads by {Math.abs(left.score - right.score)}
            </>
          ) : (
            "All square"
          )}{" "}
          · best {left.counted} on each side count
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {[left, right].map((side) => (
            <ul key={side.groupId} className="space-y-1 text-[13px]">
              {side.members.map((m) => (
                <li key={m.id} className={cn("flex justify-between gap-2", m.counted ? "text-ink" : "text-ink-3")}>
                  <span className="truncate">{m.name}</span>
                  <span className="tabular-nums">{m.points}</span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ChallengeForm({ groupId, opponents, onDone }: { groupId: string; opponents: { id: string; name: string; rank: number; teamSize: number }[]; onDone: () => void }) {
  const [opponent, setOpponent] = useState("");
  const [days, setDays] = useState<"3" | "7">("3");
  const [busy, setBusy] = useState(false);
  if (!opponents.length) return null;
  return (
    <Card title="Challenge a group">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full max-w-sm space-y-1">
          <span className="text-[13px] font-medium text-ink-2">Opponent</span>
          <SearchSelect
            ariaLabel="Opponent group"
            value={opponent}
            onChange={setOpponent}
            placeholder="Pick a group"
            options={opponents.map((o) => ({ value: o.id, label: o.name, sublabel: `#${o.rank} this week · team of ${o.teamSize}` }))}
          />
        </div>
        <div className="space-y-1">
          <span className="text-[13px] font-medium text-ink-2">Length</span>
          <SegmentedControl
            ariaLabel="Duel length"
            value={days}
            onChange={setDays}
            options={[
              { value: "3", label: "3 days" },
              { value: "7", label: "7 days" },
            ]}
          />
        </div>
        <Button
          variant="primary"
          disabled={busy || !opponent}
          onClick={async () => {
            setBusy(true);
            try {
              await call("/api/group-duels", { challengerId: groupId, opponentId: opponent, days: Number(days) });
              toast.success("Challenge sent — their captain has 48 hours to accept.");
              setOpponent("");
              onDone();
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Swords className="h-4 w-4" aria-hidden /> Send challenge
        </Button>
      </div>
      <p className="mt-2 text-[12px] text-ink-3">The duel starts when they accept. Every lesson and correct answer in that window counts.</p>
    </Card>
  );
}

function InviteCode({ code }: { code: string }) {
  const link = typeof window === "undefined" ? `/groups?join=${code}` : `${window.location.origin}/groups?join=${code}`;
  return (
    <Card title="Invite people">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-[var(--radius)] border border-border bg-surface-2 px-3 py-1.5 font-semibold tracking-wider text-ink">{code}</span>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            void navigator.clipboard.writeText(link).then(
              () => toast.success("Invite link copied"),
              () => toast.error("Couldn't copy"),
            )
          }
        >
          <Copy className="h-3.5 w-3.5" aria-hidden /> Copy invite link
        </Button>
      </div>
    </Card>
  );
}

function CaptainSettings({ group, roster, onDone }: { group: Props["group"]; roster: Props["roster"]; onDone: () => void }) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? "");
  const [visibility, setVisibility] = useState<"open" | "invite">(group.visibility === "open" ? "open" : "invite");
  const save = async (body: Record<string, unknown>, ok: string) => {
    try {
      await call(`/api/study-groups/${group.id}/settings`, body, "PATCH");
      toast.success(ok);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const others = roster.filter((r) => !r.captain);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {group.joinCode ? <InviteCode code={group.joinCode} /> : null}
      <Card title="Captain settings">
        <div className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Group name" maxLength={60} />
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" aria-label="Description" maxLength={200} />
          <SegmentedControl
            ariaLabel="Who can join"
            value={visibility}
            onChange={setVisibility}
            options={[
              { value: "open", label: "Anyone can join" },
              { value: "invite", label: "Invite only" },
            ]}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={() => void save({ name, description, visibility }, "Saved")}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void save({ newCode: true }, "New join code made — the old one stops working")}>
              New join code
            </Button>
          </div>
          {others.length ? (
            <div className="border-t border-divider pt-3">
              <p className="mb-1 text-[13px] font-medium text-ink-2">Add a co-captain</p>
              <div className="flex flex-wrap gap-2">
                {others.map((o) => (
                  <Button key={o.id} size="sm" variant="secondary" onClick={() => void save({ promote: o.id }, `${o.name} is now a captain`)}>
                    {o.name}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
