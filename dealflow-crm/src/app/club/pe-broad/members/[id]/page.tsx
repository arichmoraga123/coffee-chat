import { notFound } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { peBroadMembership } from "@/lib/club-social";
import { activityText, memberProfiles } from "@/lib/club-profiles";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { FirmChips, Hidden, LearningBars, MemberActions, TargetsLine } from "@/components/club/member-bits";

export const dynamic = "force-dynamic";

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await requireUserId();
  const m = await peBroadMembership(userId);
  if (!m) return <EmptyState title="Profiles are for PE@Broad members." />;
  const [p] = await memberProfiles(m.clubId, id);
  if (!p) notFound();

  // Head-to-head record from finished challenges between the two of us.
  const shared = id === userId ? [] : await prisma.challenge.findMany({
    where: { clubId: m.clubId, mode: { in: ["async", "live"] }, status: "complete", AND: [{ participants: { some: { userId } } }, { participants: { some: { userId: id } } }] },
    select: { participants: { select: { userId: true, score: true, totalMs: true } } },
  });
  let wins = 0, losses = 0;
  for (const c of shared) {
    const me = c.participants.find((x) => x.userId === userId);
    const them = c.participants.find((x) => x.userId === id);
    if (!me || !them) continue;
    const iWon = me.score > them.score || (me.score === them.score && me.totalMs < them.totalMs);
    if (iWon) wins++;
    else losses++;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Members", href: "/club/pe-broad/members" }, { label: p.name }]}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={p.name} size={44} />
            {p.name}
          </span>
        }
        subtitle={[p.tracks.join(" / "), p.classYear ? `Class of ${p.classYear}` : null, p.lastActiveAt ? `Active ${formatDistanceToNow(p.lastActiveAt, { addSuffix: true })}` : null].filter(Boolean).join(" · ")}
        actions={<MemberActions userId={p.userId} self={p.userId === userId} />}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <Card title="Drill">
          {p.drill === null ? (
            <Hidden />
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <StatTile value={p.drill.xp} label="points" />
                <StatTile value={p.drill.streak} label="days in a row" />
                <StatTile value={p.drill.accuracy === null ? "—" : `${p.drill.accuracy}%`} label={`accuracy · ${p.drill.answers} answers`} />
              </div>
              {p.drill.byCategory.length ? (
                <ul className="mt-5 divide-y divide-divider text-sm">
                  {p.drill.byCategory.slice(0, 8).map((c) => (
                    <li key={c.category} className="flex justify-between py-2">
                      <span className="text-ink-2">{c.category}</span>
                      <span className="text-ink">
                        {c.accuracy}% <span className="text-ink-3">· {c.answers}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
          {shared.length ? (
            <p className="mt-4 text-[13px] text-ink-3">
              Head to head: you {wins}–{losses}
            </p>
          ) : null}
        </Card>
        <Card title="Learning">
          <LearningBars learning={p.learning} />
        </Card>
        <Card title="Targeting">
          <TargetsLine targets={p.targets} />
        </Card>
        <Card title="Firms in contact">
          <FirmChips firms={p.firmsInContact} />
          <p className="mt-3 text-[13px] text-ink-3">Firm names and stages only. Contact details are never shared.</p>
        </Card>
        <Card title="Recent activity" className="lg:col-span-2">
          {p.recent.length ? (
            <ul className="space-y-2 text-sm">
              {p.recent.map((a, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span className="text-ink-2">{activityText(a.kind, a.data)}</span>
                  <span className="shrink-0 text-[13px] text-ink-3">{formatDistanceToNow(a.createdAt, { addSuffix: true })}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">Nothing yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
