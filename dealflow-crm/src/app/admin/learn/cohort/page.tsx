import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireMentorUserId } from "@/lib/auth";
import { modules } from "@/lib/learn/lessons";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function cellColor(pct: number) {
  if (pct >= 100) return "bg-emerald-600/40 text-emerald-100";
  if (pct >= 50) return "bg-emerald-900/40 text-emerald-200";
  if (pct > 0) return "bg-amber-900/30 text-amber-200";
  return "text-zinc-600";
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

  const [progress, shaky] = await Promise.all([
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
  ]);

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
          <p className="mt-1 text-sm text-zinc-400">Lesson completion by module, average score, and what the cohort marks as shaky.</p>
        </div>
        <div className="flex flex-wrap gap-1 text-xs">
          {clubs.map((c) => (
            <Link
              key={c.id}
              href={`?club=${c.id}`}
              className={cn("rounded border px-2 py-1", selected?.id === c.id ? "border-[#4a6fa5] bg-[#4a6fa5]/20" : "border-zinc-700 text-zinc-400")}
            >
              {c.name}
            </Link>
          ))}
          <Link href="?club=all" className={cn("rounded border px-2 py-1", !selected ? "border-[#4a6fa5] bg-[#4a6fa5]/20" : "border-zinc-700 text-zinc-400")}>
            Everyone learning
          </Link>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-zinc-200">Most-marked &ldquo;Shaky&rdquo; — cover these at the next meeting</h2>
        {shaky.length ? (
          <ol className="space-y-1 text-sm">
            {shaky.map((s) => (
              <li key={`${s.lessonId}-${s.prompt}`} className="flex gap-3">
                <span className="w-8 shrink-0 text-right font-mono text-amber-300">{s._count._all}</span>
                <Link href={`/learn/${s.lessonId}`} className="text-zinc-200 hover:underline">
                  <span className="font-mono text-xs text-zinc-500">{s.lessonId.replace("-", ".")}</span> {s.prompt}
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-zinc-500">No shaky checkpoints yet.</p>
        )}
      </section>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="bg-zinc-900 text-[10px] uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="sticky left-0 bg-zinc-900 px-3 py-2">Member</th>
              {groups.map((g) => (
                <th key={g.module} className="px-2 py-2 text-center" title={g.title}>
                  {g.module}
                  <span className="block normal-case tracking-normal text-zinc-600">{g.title.split(" ")[0]}</span>
                </th>
              ))}
              <th className="px-2 py-2 text-center">Done</th>
              <th className="px-2 py-2 text-center">Avg score</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={groups.length + 3} className="px-3 py-4 text-zinc-500">
                  No members yet.
                </td>
              </tr>
            ) : null}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-white/5">
                <td className="sticky left-0 bg-zinc-950 px-3 py-2">
                  <span className="font-medium text-zinc-100">{r.name}</span>
                  <span className="block text-[10px] text-zinc-500">{r.email}</span>
                </td>
                {r.perModule.map((pct, i) => (
                  <td key={i} className={cn("px-2 py-2 text-center font-mono", cellColor(pct))}>
                    {pct ? `${pct}%` : "—"}
                  </td>
                ))}
                <td className="px-2 py-2 text-center font-mono text-zinc-200">{r.totalDone}</td>
                <td className="px-2 py-2 text-center font-mono text-zinc-200">{r.avgScore === null ? "—" : `${r.avgScore}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
