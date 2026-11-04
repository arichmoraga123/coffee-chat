"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Flame, Plus, Swords, Trophy, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { DataTable, Td, Th } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { DAILY_CAP, MAX_TEAM, POINTS, STREAK_MIN, TEAM_TOP, type MemberPoints } from "@/lib/group-points-rules";
import type { LeagueRow } from "@/lib/group-competition";
import { cn } from "@/lib/utils";

type MyGroup = { id: string; name: string; description: string | null; role: string; members: number };
type OpenGroup = { id: string; name: string; description: string | null; members: number; row: LeagueRow | null };

export function LevelBadge({ level }: { level: LeagueRow["level"] }) {
  const tone = { Bronze: "neutral", Silver: "info", Gold: "warn", Platinum: "accent", Diamond: "success" } as const;
  return <Badge tone={tone[level.name as keyof typeof tone] ?? "neutral"}>{level.name}</Badge>;
}

export function GroupsHub({
  league,
  teamId,
  myPoints,
  groups,
  open,
  joinCode,
}: {
  league: LeagueRow[];
  teamId: string | null;
  myPoints: MemberPoints | null;
  groups: MyGroup[];
  open: OpenGroup[];
  joinCode: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"open" | "invite">("open");
  const [code, setCode] = useState(joinCode);
  const [busy, setBusy] = useState(false);
  const team = league.find((r) => r.id === teamId) ?? null;
  const teamGroup = groups.find((g) => g.id === teamId);

  const post = async (url: string, body: unknown) => {
    setBusy(true);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = (await res.json().catch(() => ({}))) as { error?: string; id?: string; groupId?: string; name?: string };
      if (!res.ok) throw new Error(d.error ?? "That didn't work.");
      return d;
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (!name.trim()) return toast.error("Give your group a name.");
    const d = await post("/api/study-groups", { name: name.trim(), description: description.trim(), visibility });
    if (d?.id) {
      toast.success("Group created");
      router.push(`/groups/${d.id}`);
    }
  };
  const join = async (body: { code?: string; groupId?: string }) => {
    const d = await post("/api/study-groups/join", body);
    if (d?.groupId) {
      toast.success(`Joined ${d.name}`);
      router.push(`/groups/${d.groupId}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Study groups" subtitle="Join a team, earn points for lessons and questions, and duel other groups." />

      {/* Your team */}
      {team && teamGroup ? (
        <Card>
          <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-ink-3">Your team</p>
                <LevelBadge level={team.level} />
              </div>
              <Link href={`/groups/${team.id}`} className="block text-xl font-semibold text-ink hover:underline">
                {team.name}
              </Link>
              <div className="max-w-md space-y-1">
                <ProgressBar value={team.level.progress * 100} />
                <p className="text-[12px] text-ink-3">
                  {team.level.next ? `${team.season.toLocaleString()} / ${team.level.next.min.toLocaleString()} season points to ${team.level.next.name}` : `${team.season.toLocaleString()} season points · top level`}
                </p>
              </div>
              {myPoints ? (
                <p className="text-sm text-ink-2">
                  You this week: <span className="font-semibold text-ink">{myPoints.total} points</span>
                  <span className="text-ink-3">
                    {" "}
                    · {myPoints.byKind.lesson / POINTS.lesson} lessons · {myPoints.byKind.correct / POINTS.correct} correct answers · {myPoints.byKind.dailySet / POINTS.dailySet} daily sets
                  </span>
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-3 text-center md:w-80">
              <Stat label="Rank" value={`#${team.rank}`} sub={`of ${league.length}`} />
              <Stat label="This week" value={team.week.toLocaleString()} sub="points" />
              <Stat label="Streak" value={String(team.streak)} sub={team.streak === 1 ? "week" : "weeks"} icon={team.streak ? <Flame className="h-4 w-4 text-warn" aria-hidden /> : null} />
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="p-5 text-sm text-ink-2">
            <p className="font-semibold text-ink">You&apos;re not on a team yet</p>
            <p className="mt-1">Join a group below or create one. Your first group becomes your team, and every lesson and correct answer earns it points.</p>
          </div>
        </Card>
      )}

      {/* League */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title flex items-center gap-2">
            <Trophy className="h-4 w-4 text-ink-3" aria-hidden /> This week&apos;s league
          </h2>
          <p className="text-[12px] text-ink-3">Resets Monday. A team&apos;s score is its best {TEAM_TOP} members.</p>
        </div>
        {league.length ? (
          <DataTable minWidth={720}>
            <thead>
              <tr>
                <Th className="w-12">#</Th>
                <Th>Group</Th>
                <Th className="text-right">This week</Th>
                <Th className="text-right">Last week</Th>
                <Th className="text-center">Record</Th>
                <Th className="text-center">Streak</Th>
                <Th className="text-center">Team</Th>
              </tr>
            </thead>
            <tbody>
              {league.map((r) => (
                <tr key={r.id} className={cn(r.id === teamId && "bg-accent-tint")}>
                  <Td className="font-semibold tabular-nums text-ink-2">{r.rank}</Td>
                  <Td>
                    <Link href={`/groups/${r.id}`} className="font-medium hover:underline">
                      {r.name}
                    </Link>{" "}
                    <LevelBadge level={r.level} />
                    {r.description ? <p className="mt-0.5 text-[12px] text-ink-3">{r.description}</p> : null}
                  </Td>
                  <Td className="text-right font-semibold tabular-nums">{r.week.toLocaleString()}</Td>
                  <Td className="text-right tabular-nums text-ink-2">{r.lastWeek.toLocaleString()}</Td>
                  <Td className="text-center tabular-nums text-ink-2">
                    {r.record.w}–{r.record.l}
                    {r.record.t ? `–${r.record.t}` : ""}
                  </Td>
                  <Td className="text-center tabular-nums">{r.streak ? <span className="inline-flex items-center gap-1 text-warn"><Flame className="h-3.5 w-3.5" aria-hidden />{r.streak}</span> : <span className="text-ink-3">—</span>}</Td>
                  <Td className="text-center tabular-nums text-ink-2">
                    {r.teamSize}/{MAX_TEAM}
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState title="No teams yet" description="Create the first group and challenge your friends." />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* My groups */}
        <Card title="Your groups">
          {groups.length ? (
            <ul className="divide-y divide-border">
              {groups.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <Link href={`/groups/${g.id}`} className="min-w-0 font-medium text-ink hover:underline">
                    {g.name}
                  </Link>
                  <span className="flex items-center gap-2 text-[12px] text-ink-3">
                    {g.id === teamId ? <Badge tone="accent">Your team</Badge> : null}
                    {g.role === "admin" ? <Badge tone="neutral">Captain</Badge> : null}
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" aria-hidden /> {g.members}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">You haven&apos;t joined a group yet.</p>
          )}
        </Card>

        {/* Join */}
        <Card title="Join a group">
          <div className="flex flex-wrap gap-2">
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Join code" className="max-w-40 uppercase" aria-label="Join code" />
            <Button variant="secondary" disabled={busy || !code.trim()} onClick={() => void join({ code: code.trim() })}>
              Join with code
            </Button>
          </div>
          {open.length ? (
            <ul className="mt-4 divide-y divide-border">
              {open.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span className="min-w-0">
                    <span className="font-medium text-ink">{g.name}</span>
                    <span className="ml-2 text-[12px] text-ink-3">
                      {g.members} member{g.members === 1 ? "" : "s"}
                      {g.row ? ` · #${g.row.rank} this week` : ""}
                    </span>
                    {g.description ? <span className="block text-[12px] text-ink-3">{g.description}</span> : null}
                  </span>
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => void join({ groupId: g.id })}>
                    Join
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ink-3">No open groups to join right now. Ask a friend for their group&apos;s code, or start your own.</p>
          )}
        </Card>
      </div>

      <Card title="Create a group">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto_auto] md:items-end">
          <label className="space-y-1">
            <span className="text-[13px] font-medium text-ink-2">Name</span>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. LBO Lords" maxLength={60} />
          </label>
          <label className="space-y-1">
            <span className="text-[13px] font-medium text-ink-2">Description (optional)</span>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Sophomores grinding technicals before superdays" maxLength={200} />
          </label>
          <SegmentedControl
            ariaLabel="Who can join"
            value={visibility}
            onChange={setVisibility}
            options={[
              { value: "open", label: "Anyone can join" },
              { value: "invite", label: "Invite only" },
            ]}
          />
          <Button variant="primary" disabled={busy} onClick={() => void create()}>
            <Plus className="h-4 w-4" aria-hidden /> Create
          </Button>
        </div>
      </Card>

      <details className="rounded-[var(--radius-lg)] border border-border bg-surface p-5">
        <summary className="cursor-pointer text-sm font-semibold text-ink">How points work</summary>
        <div className="mt-3 grid gap-4 text-sm text-ink-2 md:grid-cols-2">
          <ul className="space-y-1">
            <li>
              <span className="font-medium text-ink">+{POINTS.lesson}</span> finish a lesson
            </li>
            <li>
              <span className="font-medium text-ink">+{POINTS.correct}</span> each correct answer (once per question per day)
            </li>
            <li>
              <span className="font-medium text-ink">+{POINTS.dailySet}</span> finish the daily set
            </li>
            <li>
              <span className="font-medium text-ink">+{POINTS.challenge}</span> finish a challenge
            </li>
          </ul>
          <ul className="list-disc space-y-1 pl-5">
            <li>Up to {DAILY_CAP} points per person per day — steady beats cramming.</li>
            <li>You earn points for one team. You can be in other groups to chat, and switch teams once a week.</li>
            <li>A team&apos;s weekly score is its best {TEAM_TOP} members, so smaller groups can win. Teams hold up to {MAX_TEAM}.</li>
            <li>
              <Swords className="mr-1 inline h-3.5 w-3.5" aria-hidden />
              Duels: captains challenge another group to a 3- or 7-day race. Each side counts the same number of members (the smaller team&apos;s size, up to {TEAM_TOP}).
            </li>
            <li>Keep a streak by scoring {STREAK_MIN}+ points as a team every week. Season points (last 12 weeks plus duel wins) set your level.</li>
          </ul>
        </div>
      </details>
    </div>
  );
}

function Stat({ label, value, sub, icon }: { label: string; value: string; sub: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius)] border border-border p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">{label}</p>
      <p className="mt-1 flex items-center justify-center gap-1 text-2xl font-semibold tabular-nums text-ink">
        {icon}
        {value}
      </p>
      <p className="text-[11px] text-ink-3">{sub}</p>
    </div>
  );
}
