import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireMentorUserId } from "@/lib/auth";
import { modules } from "@/lib/learn/lessons";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function cellColor(pct: number) {
  if (pct >= 100) return "bg-success-bg text-success";
  if (pct >= 50) return "bg-success-bg text-success";
  if (pct > 0) return "bg-warn-bg text-warn";
  return "text-ink-3";
}

export default async function CohortPage({ searchParams }: { searchParams: Promise<{ club?: string }> }) {
  await requireMentorUserId();
  const { club: clubParam } = await searchParams;
  const clubs = await prisma.club.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  const selected =
    clubParam === "all" ? null : (clubs.find((c) => c.id === clubParam) ?? clubs.find((c) => c.name === "PE@Broad") ?? null);

  const members = selected
    ? (
        await prisma.clubMember.findMany({
          where: { clubId: selected.id, active: true },
          include: { user: { select: { id: true, name: true, email: true } } },
        })
      ).map((m) => m.user)
    : await prisma.user.findMany({
        where: { lessonProgress: { some: {} } },
        select: { id: true, name: true, email: true },
        take: 300,
      });
  const ids = members.map((m) => m.id);

  const weekAgo = new Date(new Date().getTime() - 7 * 86_400_000);
  const [progress, shaky, missedRaw] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, lessonId: true, status: true, score: true },
    }),
    prisma.reviewItem.groupBy({
      by: ["lessonId", "prompt"],
      where: { userId: { in: ids } },
      _count: { _all: true },
      orderBy: { _count: { userId: "desc" } },
      take: 15,
    }),
    prisma.questionAttempt.groupBy({
      by: ["questionId"],
      where: { userId: { in: ids }, correct: false, createdAt: { gte: weekAgo }, question: { mcqEligible: true } },
      _count: { _all: true },
      orderBy: { _count: { questionId: "desc" } },
      take: 10,
    }),
  ]);
  const missedQs = await prisma.question.findMany({
    where: { id: { in: missedRaw.map((m) => m.questionId) } },
    select: { id: true, question: true, lessonId: true },
  });
  const missed = missedRaw.map((m) => ({ ...m, q: missedQs.find((q) => q.id === m.questionId) })).filter((m) => m.q);

  const groups = modules();
  const byUser = new Map<string, typeof progress>();
  for (const p of progress) byUser.set(p.userId, [...(byUser.get(p.userId) ?? []), p]);
  const rows = members
    .map((m) => {
      const ps = byUser.get(m.id) ?? [];
      const done = new Set(ps.filter((p) => p.status === "completed").map((p) => p.lessonId));
      const scores = ps.filter((p) => p.status === "completed").map((p) => p.score);
      return {
        ...m,
        perModule: groups.map((g) => Math.round((g.lessons.filter((l) => done.has(l.id)).length / g.lessons.length) * 100)),
        totalDone: done.size,
        avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      };
    })
    .sort((a, b) => b.totalDone - a.totalDone);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Learn · Cohort</h1>
          <p className="mt-1 text-sm text-ink-2">Lesson completion by module, average score, and what the cohort marks as shaky.</p>
        </div>
        <div className="flex flex-wrap gap-1 text-xs">
          {clubs.map((c) => (
            <Link
              key={c.id}
              href={`?club=${c.id}`}
              className={cn("rounded border px-2 py-1", selected?.id === c.id ? "border-accent bg-accent-tint" : "border-border-strong text-ink-2")}
            >
              {c.name}
            </Link>
          ))}
          <Link href="?club=all" className={cn("rounded border px-2 py-1", !selected ? "border-accent bg-accent-tint" : "border-border-strong text-ink-2")}>
            Everyone learning
          </Link>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-ink">Most-missed questions this week</h2>
        {missed.length ? (
          <ol className="space-y-1 text-sm">
            {missed.map((m) => (
              <li key={m.questionId} className="flex gap-3">
                <span className="w-8 shrink-0 text-right font-mono text-danger">{m._count._all}</span>
                <span className="text-ink">
                  {m.q!.lessonId ? (
                    <Link href={`/learn/${m.q!.lessonId}`} className="mr-1 font-mono text-xs text-ink-3 hover:underline">
                      {m.q!.lessonId.replace("-", ".")}
                    </Link>
                  ) : null}
                  {m.q!.question}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-ink-3">No misses logged this week.</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-ink">Most-marked &ldquo;Shaky&rdquo; — cover these at the next meeting</h2>
        {shaky.length ? (
          <ol className="space-y-1 text-sm">
            {shaky.map((s) => (
              <li key={`${s.lessonId}-${s.prompt}`} className="flex gap-3">
                <span className="w-8 shrink-0 text-right font-mono text-warn">{s._count._all}</span>
                <Link href={`/learn/${s.lessonId}`} className="text-ink hover:underline">
                  <span className="font-mono text-xs text-ink-3">{s.lessonId.replace("-", ".")}</span> {s.prompt}
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-ink-3">No shaky checkpoints yet.</p>
        )}
      </section>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="bg-surface text-[10px] uppercase tracking-wide text-ink-3">
            <tr>
              <th className="sticky left-0 bg-surface px-3 py-2">Member</th>
              {groups.map((g) => (
                <th key={g.module} className="px-2 py-2 text-center" title={g.title}>
                  {g.module}
                  <span className="block normal-case tracking-normal text-ink-3">{g.title.split(" ")[0]}</span>
                </th>
              ))}
              <th className="px-2 py-2 text-center">Done</th>
              <th className="px-2 py-2 text-center">Avg score</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={groups.length + 3} className="px-3 py-4 text-ink-3">
                  No members yet.
                </td>
              </tr>
            ) : null}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="sticky left-0 bg-surface px-3 py-2">
                  <span className="font-medium text-ink">{r.name}</span>
                  <span className="block text-[10px] text-ink-3">{r.email}</span>
                </td>
                {r.perModule.map((pct, i) => (
                  <td key={i} className={cn("px-2 py-2 text-center font-mono", cellColor(pct))}>
                    {pct ? `${pct}%` : "—"}
                  </td>
                ))}
                <td className="px-2 py-2 text-center font-mono text-ink">{r.totalDone}</td>
                <td className="px-2 py-2 text-center font-mono text-ink">{r.avgScore === null ? "—" : `${r.avgScore}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
