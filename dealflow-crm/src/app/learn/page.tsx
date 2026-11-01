import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { modules } from "@/lib/learn/lessons";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prospect Learn" };

const DIFF: Record<string, { label: string; cls: string }> = {
  core: { label: "Core", cls: "text-success" },
  "follow-up": { label: "Follow-up", cls: "text-warn" },
  advanced: { label: "Advanced", cls: "text-info" },
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
        <p className="mt-1 text-sm text-ink-2">
          Technical lessons for banking and PE interviews — self-paced, no deadlines. Open anything, in any order; the path
          below is just the order that builds on itself.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4 sm:col-span-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink-2">
              {completedCount} of {flat.length} lessons complete
            </span>
            <span className="font-mono text-ink-2">{pct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-success-bg" style={{ width: `${pct}%` }} />
          </div>
          {recommended ? (
            <Link
              href={`/learn/${recommended.id}`}
              className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-accent bg-accent-tint p-3 hover:border-accent"
            >
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-accent">Recommended next</span>
                <span className="block truncate font-semibold text-ink">
                  {recommended.id.replace("-", ".")} · {recommended.title}
                </span>
              </span>
              <span className="shrink-0 text-sm text-accent">Start →</span>
            </Link>
          ) : (
            <p className="mt-4 text-sm text-success">You&apos;ve finished every lesson.</p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-3">Review list</p>
          {reviewItems.length ? (
            <ul className="mt-2 space-y-1.5">
              {reviewItems.slice(0, 6).map((r) => (
                <li key={r.id}>
                  <Link href={`/learn/${r.lessonId}#${r.blockId}`} className="block text-sm text-ink hover:text-accent">
                    <span className="font-mono text-xs text-ink-3">{r.lessonId.replace("-", ".")}</span> {r.prompt}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-3">Checkpoint prompts you mark &ldquo;Shaky&rdquo; show up here.</p>
          )}
        </div>
      </div>

      {unseenAnswers.length ? (
        <div className="rounded-xl border border-success/40 bg-success-bg p-4">
          <p className="text-sm font-semibold text-success">A mentor answered your question</p>
          <ul className="mt-1 space-y-1">
            {unseenAnswers.map((q) => (
              <li key={q.id}>
                <Link href={`/learn/${q.lessonId}`} className="text-sm text-success underline-offset-2 hover:underline">
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
              <h2 id={`module-${g.module}`} className="text-lg font-semibold text-ink">
                <span className="mr-2 font-mono text-sm text-ink-3">{g.module}</span>
                {g.title}
              </h2>
              <span className="text-xs text-ink-3">
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
                      "flex flex-col rounded-xl border bg-surface p-3 transition hover:border-accent",
                      isRec ? "border-accent ring-1 ring-accent" : "border-border",
                      status === "done" && "opacity-80",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-ink-3">{l.id.replace("-", ".")}</span>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                          status === "done" && "bg-success-bg text-success",
                          status === "in progress" && "bg-warn-bg text-warn",
                          status === "not started" && "bg-surface-2 text-ink-3",
                        )}
                      >
                        {status === "done" ? `Done · ${p?.score ?? 0}%` : status}
                      </span>
                    </span>
                    <span className="mt-1 font-semibold text-ink">{l.title}</span>
                    <span className="mt-1 text-xs text-ink-3">
                      <span className={DIFF[l.difficulty]?.cls}>{DIFF[l.difficulty]?.label}</span> · ~{l.estMinutes} min
                      {l.workbook ? " · Workbook" : ""}
                      {isRec ? <span className="ml-1 text-accent">· Recommended next</span> : null}
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
