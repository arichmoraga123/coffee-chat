import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { peBroadMembership } from "@/lib/club-social";
import { ensureWeeklyChallenge, topicLabel, type ChallengeTopic } from "@/lib/challenges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, Td, Th } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { WeeklyOverride } from "@/components/challenges/weekly-override";
import { modules } from "@/lib/learn/lessons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Challenges" };

export default async function ChallengesPage() {
  const userId = await requireUserId();
  const m = await peBroadMembership(userId);
  if (!m) return <EmptyState title="Challenges are for PE@Broad members." />;
  const weekly = await ensureWeeklyChallenge(m.clubId);
  const isAdmin = (await prisma.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role === "ADMIN";
  const [mine, weeklyMe] = await Promise.all([
    prisma.challenge.findMany({
      where: { clubId: m.clubId, mode: { in: ["async", "live"] }, participants: { some: { userId } } },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true, mode: true, status: true, topic: true, questionIds: true, createdById: true, createdAt: true, expiresAt: true,
        participants: { select: { userId: true, score: true, totalMs: true, finishedAt: true, user: { select: { name: true } } } },
      },
    }),
    "id" in weekly ? prisma.challengeParticipant.findUnique({ where: { challengeId_userId: { challengeId: weekly.id, userId } } }) : null,
  ]);

  const incoming = mine.filter((c) => c.status === "pending" && c.createdById !== userId);
  const active = mine.filter((c) => ["pending", "accepted", "live"].includes(c.status) && !incoming.includes(c));
  const past = mine.filter((c) => ["complete", "expired", "declined"].includes(c.status));

  const row = (c: (typeof mine)[number]) => {
    const me = c.participants.find((p) => p.userId === userId);
    const them = c.participants.find((p) => p.userId !== userId);
    return { me, them };
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Challenges"
        subtitle="Head-to-head multiple choice. Same questions for both players, graded on the server."
        actions={
          <Button variant="primary" asChild>
            <Link href="/challenges/new">New challenge</Link>
          </Button>
        }
      />

      {"id" in weekly ? (
        <Card title="This week's club challenge" action={<Link href={`/challenges/${weekly.id}`} className="text-accent hover:underline">Open</Link>}>
          <p className="text-sm text-ink-2">
            10 questions for every PE@Broad member, weighted toward last week&apos;s weakest lessons. Closes Monday.
          </p>
          <p className="mt-2 text-[13px] text-ink-3">
            {weeklyMe?.finishedAt ? `You scored ${weeklyMe.score}/10.` : "You haven't played yet."}
          </p>
        </Card>
      ) : null}

      {isAdmin ? <WeeklyOverride modules={modules().map((g) => ({ module: g.module, title: g.title }))} /> : null}

      {incoming.length ? (
        <section className="space-y-3">
          <h2 className="section-title">Waiting on you</h2>
          {incoming.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <p className="text-sm text-ink">
                <span className="font-medium">{row(c).them?.user.name}</span> challenged you · {c.mode === "live" ? "Live duel" : `${c.questionIds.length} questions`} ·{" "}
                {topicLabel(c.topic as ChallengeTopic)}
                <span className="block text-[13px] text-ink-3">Expires {formatDistanceToNow(c.expiresAt, { addSuffix: true })}</span>
              </p>
              <Button variant="primary" asChild>
                <Link href={`/challenges/${c.id}`}>Open</Link>
              </Button>
            </Card>
          ))}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="section-title">In progress</h2>
        {active.length ? (
          <DataTable minWidth={560}>
            <tbody>
              {active.map((c) => {
                const { me, them } = row(c);
                return (
                  <tr key={c.id}>
                    <Td>
                      vs <span className="font-medium">{them?.user.name}</span>
                      <span className="block text-[13px] text-ink-3">{topicLabel(c.topic as ChallengeTopic)}</span>
                    </Td>
                    <Td>
                      <Badge tone={c.status === "live" ? "info" : "neutral"}>
                        {c.status === "pending" ? "Waiting for them to accept" : c.status === "live" ? "Live now" : me?.finishedAt ? "Waiting for them to finish" : "Your turn"}
                      </Badge>
                    </Td>
                    <Td className="text-right">
                      <Link href={`/challenges/${c.id}`} className="text-[13px] font-medium text-accent hover:underline">
                        Open
                      </Link>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        ) : (
          <p className="text-sm text-ink-3">Nothing in progress.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="section-title">Results</h2>
        {past.length ? (
          <DataTable minWidth={560}>
            <thead>
              <tr>
                <Th>Opponent</Th>
                <Th>Result</Th>
                <Th className="text-right">Score</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {past.map((c) => {
                const { me, them } = row(c);
                const won = me && them && (me.score > them.score || (me.score === them.score && me.totalMs < them.totalMs));
                const tie = me && them && me.score === them.score && me.totalMs === them.totalMs;
                return (
                  <tr key={c.id}>
                    <Td>
                      {them?.user.name}
                      <span className="block text-[13px] text-ink-3">{topicLabel(c.topic as ChallengeTopic)}</span>
                    </Td>
                    <Td>
                      {c.status !== "complete" ? (
                        <Badge>{c.status === "declined" ? "Declined" : "Expired"}</Badge>
                      ) : tie ? (
                        <Badge>Tie</Badge>
                      ) : won ? (
                        <Badge tone="success">Won</Badge>
                      ) : (
                        <Badge tone="danger">Lost</Badge>
                      )}
                    </Td>
                    <Td className="text-right text-ink-2">{c.status === "complete" ? `${me?.score ?? 0}–${them?.score ?? 0}` : "—"}</Td>
                    <Td className="text-right">
                      <Link href={`/challenges/${c.id}`} className="text-[13px] font-medium text-accent hover:underline">
                        Review
                      </Link>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        ) : (
          <p className="text-sm text-ink-3">No finished challenges yet.</p>
        )}
      </section>
    </div>
  );
}
