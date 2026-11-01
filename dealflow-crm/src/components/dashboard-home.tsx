import Link from "next/link";
import { addDays, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { STAGE_LABELS } from "@/lib/constants";
import { loadTasks } from "@/lib/tasks-data";
import { modules } from "@/lib/learn/lessons";
import { isGraded } from "@/lib/learn/schema";
import { utcDay, DAILY_SET_SIZE } from "@/lib/mcq/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Accordion } from "@/components/ui/accordion";
import { DataTable, Td, Th } from "@/components/ui/data-table";
import { DashboardNewsFeed } from "@/components/dashboard-news-feed";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { Greeting } from "@/components/home/greeting";
import { cn } from "@/lib/utils";

const PIPELINE_ORDER = ["TARGET", "NETWORKING", "APPLIED", "FIRST_ROUND", "TECHNICAL", "SUPERDAY", "OFFER"] as const;

const daysText = (n: number) => (n > 0 ? `Active ${n} day${n === 1 ? "" : "s"} in a row` : "Start a run today");

export async function DashboardHome() {
  const userId = await requireUserId();
  const today = utcDay();
  const now = new Date();
  const weekOut = addDays(now, 7);

  const [user, lessonRows, attempts, drillLog, dailySet, pipeline, events, coffee, taskRows, membership] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingDone: true, drillStreak: true, weeklyXP: true, name: true },
    }),
    prisma.lessonProgress.findMany({
      where: { userId },
      select: { lessonId: true, status: true, blockState: true, updatedAt: true },
    }),
    prisma.questionAttempt.findMany({
      where: { userId, question: { mcqEligible: true } },
      select: { correct: true, question: { select: { lessonId: true } } },
    }),
    prisma.dailyDrillLog.findUnique({ where: { userId_date: { userId, date: today } }, select: { correct: true, questionsAnswered: true } }),
    prisma.dailyQuestionSet.findUnique({ where: { userId_date: { userId, date: today } }, select: { questionIds: true } }),
    prisma.opportunity.groupBy({ by: ["stage"], where: { userId }, _count: { _all: true } }),
    prisma.recruitingEvent.findMany({
      where: { userId, date: { gte: now, lte: weekOut } },
      orderBy: { date: "asc" },
      take: 6,
      select: { id: true, title: true, date: true },
    }),
    prisma.interaction.findMany({
      where: { userId, type: "COFFEE_CHAT", date: { gte: now, lte: weekOut } },
      orderBy: { date: "asc" },
      take: 6,
      select: { id: true, date: true, contact: { select: { fullName: true } } },
    }),
    loadTasks(userId, { dueBefore: addDays(now, 8), take: 20 }),
    prisma.clubMember.findFirst({ where: { userId, active: true, club: { name: "PE@Broad" } }, select: { clubId: true } }),
  ]);

  /* Learning progress by module */
  const groups = modules();
  const progress = new Map(lessonRows.map((r) => [r.lessonId, r]));
  const accByModule = new Map<number, { right: number; total: number }>();
  const accByLesson = new Map<string, { right: number; total: number }>();
  for (const a of attempts) {
    const l = a.question.lessonId;
    if (!l) continue;
    const m = Number(l.split("-")[0]);
    const sm = accByModule.get(m) ?? { right: 0, total: 0 };
    const sl = accByLesson.get(l) ?? { right: 0, total: 0 };
    sm.total++;
    sl.total++;
    if (a.correct) {
      sm.right++;
      sl.right++;
    }
    accByModule.set(m, sm);
    accByLesson.set(l, sl);
  }
  const moduleRows = groups.map((g) => {
    const done = g.lessons.filter((l) => progress.get(l.id)?.status === "completed").length;
    const acc = accByModule.get(g.module);
    return { module: g.module, title: g.title, done, total: g.lessons.length, accuracy: acc && acc.total >= 3 ? Math.round((acc.right / acc.total) * 100) : null };
  });
  const focusModule = moduleRows.filter((r) => r.accuracy !== null).sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))[0]?.module ?? null;

  /* Continue learning: most recently touched unfinished lesson, else the first unstarted one */
  const flat = groups.flatMap((g) => g.lessons);
  const inProgress = lessonRows
    .filter((r) => r.status !== "completed")
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .map((r) => flat.find((l) => l.id === r.lessonId))
    .find(Boolean);
  const nextLesson = inProgress ?? flat.find((l) => progress.get(l.id)?.status !== "completed") ?? null;
  let lessonPct = 0;
  if (nextLesson) {
    const tracked = nextLesson.blocks.filter((b) => isGraded(b) || b.type === "stepThrough" || b.type === "checkpoint");
    const state = (progress.get(nextLesson.id)?.blockState ?? {}) as Record<string, { done?: boolean }>;
    lessonPct = tracked.length ? Math.round((tracked.filter((b) => state[b.id]?.done).length / tracked.length) * 100) : 0;
  }

  /* Daily set */
  const weakest = [...accByLesson.entries()]
    .filter(([, s]) => s.total >= 2)
    .sort((a, b) => a[1].right / a[1].total - b[1].right / b[1].total)
    .slice(0, 2)
    .map(([id]) => flat.find((l) => l.id === id)?.title)
    .filter(Boolean) as string[];
  let dailyLeft = DAILY_SET_SIZE;
  if (drillLog) dailyLeft = 0;
  else if (dailySet) {
    const answered = await prisma.questionAttempt.count({
      where: { userId, context: "drill", questionId: { in: dailySet.questionIds }, createdAt: { gte: new Date(`${today}T00:00:00Z`) } },
    });
    dailyLeft = Math.max(0, dailySet.questionIds.length - answered);
  }

  /* This week */
  const calls = [
    ...events.map((e) => ({ key: `e-${e.id}`, title: e.title, date: e.date })),
    ...coffee.map((c) => ({ key: `c-${c.id}`, title: `Coffee chat · ${c.contact.fullName}`, date: c.date })),
  ]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 4);
  const todayYmd = now.toISOString().slice(0, 10);
  const followups = taskRows.slice(0, 4).map((t) => ({ key: t.id, id: t.contactId, name: t.contactName, label: t.title, due: t.due, overdue: t.due < todayYmd }));
  const moreFollowups = Math.max(0, taskRows.length - followups.length);

  /* PE@Broad standings: weekly points among active members */
  let standings: { userId: string; name: string; points: number; rank: number }[] = [];
  let myStanding: (typeof standings)[number] | null = null;
  if (membership) {
    const members = await prisma.clubMember.findMany({
      where: { clubId: membership.clubId, active: true },
      select: { user: { select: { id: true, name: true, weeklyXP: true } } },
    });
    const ranked = members
      .map((m) => ({ userId: m.user.id, name: m.user.name, points: m.user.weeklyXP }))
      .sort((a, b) => b.points - a.points)
      .map((r, i) => ({ ...r, rank: i + 1 }));
    standings = ranked.slice(0, 3);
    myStanding = ranked.find((r) => r.userId === userId) ?? null;
  }

  const stageCount = new Map(pipeline.map((p) => [p.stage, p._count._all]));
  const firstName = (user?.name ?? "").split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      {!user?.onboardingDone ? <OnboardingWizard /> : null}

      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[13px] text-ink-3">{format(now, "EEEE, MMMM d")}</p>
          <h1 className="page-title mt-1">
            <Greeting /> {firstName}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" asChild>
            <Link href="/contacts">Log a contact</Link>
          </Button>
          {dailyLeft > 0 ? (
            <Button variant="primary" asChild>
              <Link href="/practice/daily">Start daily set</Link>
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3">
        <Card title="Daily set" action={<Link href="/practice" className="text-accent hover:underline">Practice</Link>}>
          {dailyLeft > 0 ? (
            <>
              <p className="text-sm text-ink">
                {dailyLeft === DAILY_SET_SIZE ? `${DAILY_SET_SIZE} questions` : `${dailyLeft} of ${DAILY_SET_SIZE} left`} · about{" "}
                {Math.max(2, Math.round(dailyLeft * 1.2))} minutes
              </p>
              <p className="mt-1 text-[13px] text-ink-3">
                {weakest.length ? `Focus: ${weakest.join(", ")}` : "Reviews first, then your weakest lessons"}
              </p>
              <Button variant={dailyLeft > 0 ? "secondary" : "primary"} className="mt-4 h-11 w-full sm:h-9 sm:w-auto" asChild>
                <Link href="/practice/daily">{dailyLeft === DAILY_SET_SIZE ? "Start" : "Resume"}</Link>
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-ink">
                Done for today{drillLog ? ` · ${drillLog.correct}/${drillLog.questionsAnswered} correct` : ""}
              </p>
              <p className="mt-1 text-[13px] text-ink-3">A new set is ready tomorrow.</p>
            </>
          )}
          <p className="mt-4 text-[13px] text-ink-3">{daysText(user?.drillStreak ?? 0)}</p>
        </Card>

        <Card title="Continue learning" action={<Link href="/learn" className="text-accent hover:underline">All lessons</Link>}>
          {nextLesson ? (
            <>
              <p className="text-[13px] text-ink-3">
                Module {nextLesson.module} · {nextLesson.moduleTitle}
              </p>
              <p className="mt-1 font-medium text-ink">
                {nextLesson.id.replace("-", ".")} {nextLesson.title}
              </p>
              <ProgressBar value={lessonPct} className="mt-3" label={`${lessonPct}%`} />
              <Button variant="secondary" className="mt-4" asChild>
                <Link href={`/learn/${nextLesson.id}`}>{lessonPct > 0 ? "Resume lesson" : "Start lesson"}</Link>
              </Button>
            </>
          ) : (
            <p className="text-sm text-ink-2">You&apos;ve finished every lesson.</p>
          )}
        </Card>

        <Card title="This week" action={<Link href="/tasks" className="text-accent hover:underline">Tasks</Link>}>
          {calls.length === 0 && followups.length === 0 ? (
            <p className="text-sm text-ink-3">Nothing scheduled in the next 7 days.</p>
          ) : (
            <ul className="space-y-2.5 text-sm">
              {calls.map((c) => (
                <li key={c.key} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 text-ink [overflow-wrap:anywhere]">{c.title}</span>
                  <span className="shrink-0 text-[13px] text-ink-3">{format(c.date, "EEE h:mm a")}</span>
                </li>
              ))}
              {followups.map((o) => (
                <li key={o.key}>
                  <Link href="/tasks" className="flex items-baseline justify-between gap-3 hover:underline">
                    <span className={cn("min-w-0 [overflow-wrap:anywhere]", o.overdue ? "text-warn" : "text-ink")}>
                      {o.label} · {o.name}
                    </span>
                    <span className={cn("shrink-0 text-[13px]", o.overdue ? "text-warn" : "text-ink-3")}>
                      {o.overdue ? "Overdue" : o.due === todayYmd ? "Today" : format(new Date(`${o.due}T12:00:00Z`), "EEE")}
                    </span>
                  </Link>
                </li>
              ))}
              {moreFollowups ? (
                <li>
                  <Link href="/tasks" className="text-[13px] text-accent hover:underline">
                    {moreFollowups} more on Tasks
                  </Link>
                </li>
              ) : null}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Learning progress</h2>
            <Link href="/learn" className="text-[13px] text-accent hover:underline">
              Lessons
            </Link>
          </div>
          <DataTable minWidth={520}>
            <thead>
              <tr>
                <Th>Module</Th>
                <Th className="text-right">Lessons</Th>
                <Th className="text-right">Accuracy</Th>
                <Th className="w-[30%]">Progress</Th>
              </tr>
            </thead>
            <tbody>
              {moduleRows.map((r) => (
                <tr key={r.module}>
                  <Td>
                    <span className="text-ink-3">{r.module}.</span> {r.title}
                    {r.module === focusModule ? (
                      <Badge tone="warn" className="ml-2">
                        Focus
                      </Badge>
                    ) : null}
                  </Td>
                  <Td className="text-right text-ink-2">
                    {r.done}/{r.total}
                  </Td>
                  <Td className={cn("text-right", r.accuracy === null ? "text-ink-3" : "text-ink-2")}>
                    {r.accuracy === null ? "—" : `${r.accuracy}%`}
                  </Td>
                  <Td>
                    <ProgressBar value={r.done} max={r.total} size="sm" />
                  </Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </section>

        <div className="space-y-4">
          {membership ? (
            <Card title="PE@Broad standings" action={<Link href="/club/members" className="text-accent hover:underline">Club</Link>}>
              <p className="-mt-2 mb-3 text-[13px] text-ink-3">Points this week</p>
              <ol className="divide-y divide-divider text-sm">
                {standings.map((s) => (
                  <li key={s.userId} className={cn("flex items-center gap-3 py-2", s.userId === userId && "-mx-2 rounded bg-accent-tint px-2")}>
                    <span className="w-5 text-ink-3">{s.rank}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{s.name}</span>
                    <span className="text-ink-2">{s.points}</span>
                  </li>
                ))}
                {myStanding && myStanding.rank > 3 ? (
                  <li className="-mx-2 flex items-center gap-3 rounded bg-accent-tint px-2 py-2">
                    <span className="w-5 text-ink-3">{myStanding.rank}</span>
                    <span className="min-w-0 flex-1 truncate font-medium text-ink">You</span>
                    <span className="text-ink-2">{myStanding.points}</span>
                  </li>
                ) : null}
              </ol>
            </Card>
          ) : null}
          <Accordion title="Market news">
            <DashboardNewsFeed />
          </Accordion>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Recruiting pipeline</h2>
          <Link href="/pipeline" className="text-[13px] text-accent hover:underline">
            Open pipeline
          </Link>
        </div>
        <Link
          href="/pipeline"
          className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-border bg-divider sm:grid-cols-4 lg:grid-cols-7"
        >
          {PIPELINE_ORDER.map((stage) => (
            <div key={stage} className="bg-surface px-4 py-3 hover:bg-surface-2">
              <p className="text-[22px] font-semibold text-ink">{stageCount.get(stage) ?? 0}</p>
              <p className="text-[13px] text-ink-3">{STAGE_LABELS[stage]}</p>
            </div>
          ))}
        </Link>
      </section>
    </div>
  );
}
