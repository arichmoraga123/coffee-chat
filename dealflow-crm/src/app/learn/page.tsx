import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { modules } from "@/lib/learn/lessons";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prospect Learn" };

const DIFF: Record<string, { label: string; cls: string }> = {
  core: { label: "Core", cls: "text-emerald-300" },
  "follow-up": { label: "Follow-up", cls: "text-amber-300" },
  advanced: { label: "Advanced", cls: "text-purple-300" },
};

export default async function LearnPage() {
  const userId = await requireUserId();
  const [progressRows, reviewItems, unseenAnswers] = await Promise.all([
    prisma.lessonProgress.findMany({ where: { userId }, select: { lessonId: true, status: true, score: true } }),
    prisma.reviewItem.findMany({
      where: { userId, resolved: false },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, lessonId: true, blockId: true, prompt: true },
    }),
    prisma.mentorQuestion.findMany({
      where: { userId, status: "answered", seenByUser: false },
      select: { id: true, lessonId: true, question: true },
    }),
  ]);
  const progress = new Map(progressRows.map((p) => [p.lessonId, p]));
  const groups = modules();
  const flat = groups.flatMap((g) => g.lessons);
  const recommended = flat.find((l) => progress.get(l.id)?.status !== "completed") ?? null;
  const completedCount = flat.filter((l) => progress.get(l.id)?.status === "completed").length;
  const pct = flat.length ? Math.round((completedCount / flat.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="page-title">Learn</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Technical lessons for banking and PE interviews — self-paced, no deadlines. Open anything, in any order; the path
          below is just the order that builds on itself.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4 sm:col-span-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-300">
              {completedCount} of {flat.length} lessons complete
            </span>
            <span className="font-mono text-zinc-400">{pct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-emerald-500/80" style={{ width: `${pct}%` }} />
          </div>
          {recommended ? (
            <Link
              href={`/learn/${recommended.id}`}
              className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-[#4a6fa5]/50 bg-[#4a6fa5]/15 p-3 hover:border-[#4a6fa5]"
            >
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-[#a8c0e6]">Recommended next</span>
                <span className="block truncate font-semibold text-zinc-50">
                  {recommended.id.replace("-", ".")} · {recommended.title}
                </span>
              </span>
              <span className="shrink-0 text-sm text-[#a8c0e6]">Start →</span>
            </Link>
          ) : (
            <p className="mt-4 text-sm text-emerald-300">You&apos;ve finished every lesson. 🎉</p>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Review list</p>
          {reviewItems.length ? (
            <ul className="mt-2 space-y-1.5">
              {reviewItems.slice(0, 6).map((r) => (
                <li key={r.id}>
                  <Link href={`/learn/${r.lessonId}#${r.blockId}`} className="block text-sm text-zinc-200 hover:text-[#a8c0e6]">
                    <span className="font-mono text-xs text-zinc-500">{r.lessonId.replace("-", ".")}</span> {r.prompt}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">Checkpoint prompts you mark &ldquo;Shaky&rdquo; show up here.</p>
          )}
        </div>
      </div>

      {unseenAnswers.length ? (
        <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-4">
          <p className="text-sm font-semibold text-emerald-200">A mentor answered your question</p>
          <ul className="mt-1 space-y-1">
            {unseenAnswers.map((q) => (
              <li key={q.id}>
                <Link href={`/learn/${q.lessonId}`} className="text-sm text-emerald-100 underline-offset-2 hover:underline">
                  {q.lessonId.replace("-", ".")} · {q.question.slice(0, 120)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {groups.map((g) => {
        const done = g.lessons.filter((l) => progress.get(l.id)?.status === "completed").length;
        return (
          <section key={g.module} aria-labelledby={`module-${g.module}`}>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 id={`module-${g.module}`} className="text-lg font-semibold text-zinc-100">
                <span className="mr-2 font-mono text-sm text-zinc-500">{g.module}</span>
                {g.title}
              </h2>
              <span className="text-xs text-zinc-500">
                {done}/{g.lessons.length} done
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {g.lessons.map((l) => {
                const p = progress.get(l.id);
                const status = p?.status === "completed" ? "done" : p ? "in progress" : "not started";
                const isRec = recommended?.id === l.id;
                return (
                  <Link
                    key={l.id}
                    href={`/learn/${l.id}`}
                    className={cn(
                      "flex flex-col rounded-xl border bg-zinc-900/50 p-3 transition hover:border-[#4a6fa5]/60",
                      isRec ? "border-[#4a6fa5] ring-1 ring-[#4a6fa5]/40" : "border-white/10",
                      status === "done" && "opacity-80",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-zinc-500">{l.id.replace("-", ".")}</span>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                          status === "done" && "bg-emerald-900/50 text-emerald-300",
                          status === "in progress" && "bg-amber-900/40 text-amber-300",
                          status === "not started" && "bg-zinc-800 text-zinc-500",
                        )}
                      >
                        {status === "done" ? `Done · ${p?.score ?? 0}%` : status}
                      </span>
                    </span>
                    <span className="mt-1 font-semibold text-zinc-100">{l.title}</span>
                    <span className="mt-1 text-xs text-zinc-500">
                      <span className={DIFF[l.difficulty]?.cls}>{DIFF[l.difficulty]?.label}</span> · ~{l.estMinutes} min
                      {l.workbook ? " · 📗 workbook" : ""}
                      {isRec ? <span className="ml-1 text-[#a8c0e6]">· Recommended next</span> : null}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
