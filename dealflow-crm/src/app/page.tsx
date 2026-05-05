import { startOfWeek, isAfter, subDays } from "date-fns";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { STAGE_LABELS } from "@/lib/constants";
import { requireUserId } from "@/lib/auth";
import { getFollowUpSteps, getFollowUpStatus } from "@/lib/follow-up";
import { DashboardDailyDrill } from "@/components/dashboard-daily-drill";
import { DashboardNewsFeed } from "@/components/dashboard-news-feed";
import { DashboardRecruitingCountdown } from "@/components/dashboard-recruiting-countdown";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  const userId = await requireUserId();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      onboardingDone: true,
      drillStreak: true,
      xp: true,
      weeklyXP: true,
      name: true,
      recruitingTarget: true,
    },
  });

  const coldThreshold = subDays(new Date(), 45);

  const [
    knownCount,
    contactsThisWeek,
    contactsForFollowUps,
    recruitingEvents,
    coffeeInteractions,
    pipeline,
    coldContacts,
  ] = await Promise.all([
    prisma.userQuestionProgress.count({ where: { userId, status: "known" } }),
    prisma.contact.count({
      where: { userId, createdAt: { gte: weekStart } },
    }),
    prisma.contact.findMany({
      where: { userId },
      select: { id: true, fullName: true, lastInteractionDate: true },
    }),
    prisma.recruitingEvent.findMany({
      where: { userId, date: { gte: new Date() } },
      orderBy: { date: "asc" },
      take: 12,
    }),
    prisma.interaction.findMany({
      where: { userId, type: "COFFEE_CHAT" },
      orderBy: { date: "asc" },
      take: 30,
      include: { contact: { select: { fullName: true } } },
    }),
    prisma.opportunity.groupBy({ by: ["stage"], where: { userId }, _count: { _all: true } }),
    prisma.contact.findMany({
      where: {
        userId,
        warmthScore: { in: ["HOT", "ADVOCATE"] },
        OR: [{ lastInteractionDate: null }, { lastInteractionDate: { lt: coldThreshold } }],
      },
      select: { id: true, fullName: true, lastInteractionDate: true, warmthScore: true },
      orderBy: { lastInteractionDate: "asc" },
      take: 10,
    }),
  ]);

  const followUpAlerts = contactsForFollowUps
    .flatMap((contact) => {
      if (!contact.lastInteractionDate) return [];
      const status = getFollowUpStatus(contact.lastInteractionDate);
      return getFollowUpSteps(contact.lastInteractionDate).map((step) => ({
        contactId: contact.id,
        contactName: contact.fullName,
        label: step.label,
        dueAt: step.dueAt,
        isOverdue: step.isOverdue,
        status,
      }));
    })
    .sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.dueAt.getTime() - b.dueAt.getTime();
    })
    .slice(0, 12);

  const now = new Date();
  const upcomingItems = [
    ...recruitingEvents.map((e) => ({
      key: `e-${e.id}`,
      title: e.title,
      date: e.date,
      kind: e.type as string,
    })),
    ...coffeeInteractions
      .filter((i) => !isAfter(now, i.date))
      .map((i) => ({
        key: `c-${i.id}`,
        title: `Coffee · ${i.contact.fullName}`,
        date: i.date,
        kind: "coffee_chat",
      })),
  ]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 3);

  const statusStyles: Record<string, string> = {
    red: "border-l-[4px] border-red-500 bg-gradient-to-r from-red-950/55 via-red-950/25 to-transparent shadow-[inset_3px_0_0_0_rgba(248,113,113,0.35)]",
    yellow:
      "border-l-[4px] border-amber-400 bg-gradient-to-r from-amber-950/50 via-amber-950/20 to-transparent shadow-[inset_3px_0_0_0_rgba(251,191,36,0.35)]",
    green:
      "border-l-[4px] border-emerald-400 bg-gradient-to-r from-emerald-950/45 via-emerald-950/15 to-transparent shadow-[inset_3px_0_0_0_rgba(52,211,153,0.35)]",
  };

  const statusText: Record<string, string> = {
    red: "font-medium text-red-200",
    yellow: "font-medium text-amber-200",
    green: "font-medium text-emerald-200",
  };

  return (
    <div className="min-h-0 space-y-8 text-zinc-100">
      {!user?.onboardingDone ? <OnboardingWizard /> : null}

      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <h1 className="page-title">Command center</h1>
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            Recruiting hub · {user?.name ?? "Analyst"}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-right font-mono text-[11px] text-zinc-400">
          <span>
            STRK <span className="text-orange-400">{user?.drillStreak ?? 0}</span>
          </span>
          <span>
            XP <span className="text-cyan-400">{user?.xp ?? 0}</span>
          </span>
          <span>
            WXP <span className="text-cyan-300">{user?.weeklyXP ?? 0}</span>
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <DashboardDailyDrill
            initialStreak={user?.drillStreak ?? 0}
            initialXp={user?.xp ?? 0}
            initialWeeklyXp={user?.weeklyXP ?? 0}
          />
          <DashboardNewsFeed />
        </div>

        <div className="space-y-6">
          <Card className="p-3">
            <p className="section-label">Follow-up radar</p>
            <div className="mt-3 max-h-[220px] space-y-2 overflow-y-auto pr-1 text-[11px]">
              {followUpAlerts.length === 0 ? (
                <p className="text-sm text-zinc-500">No touchpoints yet. Log coffee chats to populate.</p>
              ) : (
                followUpAlerts.map((alert) => (
                  <div
                    key={`${alert.contactId}-${alert.label}`}
                    className={cn(
                      "rounded-r-md border border-white/10 py-2 pl-2.5 pr-2",
                      statusStyles[alert.status],
                    )}
                  >
                    <p className="font-semibold text-zinc-100">{alert.contactName}</p>
                    <p
                      className={cn(
                        "text-xs",
                        alert.status === "green"
                          ? statusText.green
                          : alert.status === "red" || alert.isOverdue
                            ? statusText.red
                            : statusText.yellow,
                      )}
                    >
                      {alert.label}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      Due {alert.dueAt.toLocaleDateString()} · {alert.status.toUpperCase()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-3">
            <p className="section-label">Cold contacts</p>
            <p className="mt-0.5 text-[10px] text-zinc-500">
              HOT / ADVOCATE with no touch in 45+ days — high-value relationships slipping.
            </p>
            <div className="mt-2 max-h-[180px] space-y-1.5 overflow-y-auto pr-1 text-[11px]">
              {coldContacts.length === 0 ? (
                <p className="text-zinc-500">None right now.</p>
              ) : (
                coldContacts.map((c) => (
                  <Link
                    key={c.id}
                    href={`/contacts/${c.id}`}
                    className="block rounded-md border border-amber-500/25 bg-gradient-to-r from-amber-950/40 to-transparent px-2 py-1.5 transition-all hover:-translate-y-0.5 hover:border-amber-400/40 hover:shadow-md hover:shadow-amber-900/20"
                  >
                    <p className="font-semibold text-amber-100">{c.fullName}</p>
                    <p className="text-[10px] text-zinc-500">
                      {c.warmthScore}
                      {" · "}
                      {c.lastInteractionDate
                        ? `Last: ${c.lastInteractionDate.toLocaleDateString()}`
                        : "Never logged"}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </Card>

          <Card className="p-3">
            <p className="section-label">Next on calendar</p>
            <div className="mt-3 space-y-1.5 text-[11px]">
              {upcomingItems.length === 0 ? (
                <p className="text-sm text-zinc-500">No upcoming items. Add events on Calendar.</p>
              ) : (
                upcomingItems.map((u) => (
                  <div
                    key={u.key}
                    className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.02] px-2 py-1.5 transition-all hover:-translate-y-0.5 hover:border-cyan-500/25"
                  >
                    <span className="min-w-0 truncate font-medium text-zinc-200">{u.title}</span>
                    <span className="shrink-0 text-[10px] text-zinc-500">
                      {u.date.toLocaleDateString()} {u.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-3">
            <p className="section-label">Quick stats</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-orange-950/50 via-zinc-900/90 to-zinc-950 p-2.5 shadow-inner transition-all hover:-translate-y-0.5">
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">Streak</p>
                <p className="text-base font-semibold tabular-nums text-orange-400">{user?.drillStreak ?? 0}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-cyan-950/40 via-zinc-900/90 to-zinc-950 p-2.5 shadow-inner transition-all hover:-translate-y-0.5">
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">Mastered</p>
                <p className="text-base font-semibold tabular-nums text-cyan-400">{knownCount}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-gradient-to-br from-emerald-950/45 via-zinc-900/90 to-zinc-950 p-2.5 shadow-inner transition-all hover:-translate-y-0.5">
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">Contacts +wk</p>
                <p className="text-base font-semibold tabular-nums text-emerald-400">{contactsThisWeek}</p>
              </div>
            </div>
          </Card>

          <DashboardRecruitingCountdown userId={userId} targets={user?.recruitingTarget ?? []} />

          <Card className="p-3">
            <p className="section-label">Pipeline snapshot</p>
            <div className="mt-2 space-y-1 text-[11px]">
              {pipeline.map((p) => (
                <div key={p.stage} className="flex items-center justify-between">
                  <span className="text-zinc-400">{STAGE_LABELS[p.stage]}</span>
                  <span className="font-semibold text-cyan-400">{p._count._all}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
