import { startOfWeek, isAfter, subDays } from "date-fns";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { STAGE_LABELS } from "@/lib/constants";
import { requireUserId } from "@/lib/auth";
import { getFollowUpSteps, getFollowUpStatus } from "@/lib/follow-up";
import { DashboardDailyDrill } from "@/components/dashboard-daily-drill";
import { DashboardNewsFeed } from "@/components/dashboard-news-feed";
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
    red: "border-l-4 border-red-500 bg-red-950/20",
    yellow: "border-l-4 border-amber-500 bg-amber-950/15",
    green: "border-l-4 border-emerald-600 bg-emerald-950/10",
  };

  return (
    <div className="min-h-0 space-y-3 text-zinc-100">
      {!user?.onboardingDone ? <OnboardingWizard /> : null}

      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-zinc-800 pb-2">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-50">Command center</h1>
          <p className="text-[11px] uppercase tracking-widest text-zinc-500">
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

      <div className="grid gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-3">
          <DashboardDailyDrill
            initialStreak={user?.drillStreak ?? 0}
            initialXp={user?.xp ?? 0}
            initialWeeklyXp={user?.weeklyXP ?? 0}
          />
          <DashboardNewsFeed />
        </div>

        <div className="space-y-3">
          <Card className="border-zinc-800 bg-zinc-900/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Follow-up radar</p>
            <div className="mt-2 max-h-[220px] space-y-1.5 overflow-y-auto pr-1 text-[11px]">
              {followUpAlerts.length === 0 ? (
                <p className="text-zinc-500">No touchpoints yet. Log coffee chats to populate.</p>
              ) : (
                followUpAlerts.map((alert) => (
                  <div
                    key={`${alert.contactId}-${alert.label}`}
                    className={cn(
                      "rounded border border-zinc-800/80 px-2 py-1.5",
                      statusStyles[alert.status],
                    )}
                  >
                    <p className="font-semibold text-zinc-200">{alert.contactName}</p>
                    <p className={alert.isOverdue ? "text-red-300" : "text-amber-200/90"}>{alert.label}</p>
                    <p className="text-[10px] text-zinc-500">
                      Due {alert.dueAt.toLocaleDateString()} · {alert.status.toUpperCase()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Cold contacts</p>
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
                    className="block rounded border border-amber-900/40 bg-amber-950/15 px-2 py-1.5 hover:border-amber-700/50"
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

          <Card className="border-zinc-800 bg-zinc-900/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Next on calendar</p>
            <div className="mt-2 space-y-1.5 text-[11px]">
              {upcomingItems.length === 0 ? (
                <p className="text-zinc-500">No upcoming items. Add events on Calendar.</p>
              ) : (
                upcomingItems.map((u) => (
                  <div key={u.key} className="flex items-center justify-between gap-2 rounded border border-zinc-800 px-2 py-1.5">
                    <span className="min-w-0 truncate font-medium text-zinc-200">{u.title}</span>
                    <span className="shrink-0 text-[10px] text-zinc-500">
                      {u.date.toLocaleDateString()} {u.date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Quick stats</p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center font-mono text-[11px]">
              <div className="rounded border border-zinc-800 bg-black/40 p-2">
                <p className="text-[10px] text-zinc-500">Streak</p>
                <p className="text-sm text-orange-400">{user?.drillStreak ?? 0}</p>
              </div>
              <div className="rounded border border-zinc-800 bg-black/40 p-2">
                <p className="text-[10px] text-zinc-500">Mastered</p>
                <p className="text-sm text-cyan-400">{knownCount}</p>
              </div>
              <div className="rounded border border-zinc-800 bg-black/40 p-2">
                <p className="text-[10px] text-zinc-500">Contacts +wk</p>
                <p className="text-sm text-emerald-400">{contactsThisWeek}</p>
              </div>
            </div>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Pipeline snapshot</p>
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
