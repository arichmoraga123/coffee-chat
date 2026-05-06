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
import { calendarVerticalsFromProfile } from "@/lib/recruiting-calendar-utils";
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
      careerTracks: true,
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
    red: "border-l-[3px] border-[#c9a84c] bg-[#141414] shadow-[inset_3px_0_0_0_rgba(201,168,76,0.35)]",
    yellow: "border-l-[3px] border-[#c9a84c]/70 bg-[#141414] shadow-[inset_3px_0_0_0_rgba(201,168,76,0.2)]",
    green: "border-l-[3px] border-[#c9a84c]/45 bg-[#141414] shadow-[inset_3px_0_0_0_rgba(201,168,76,0.12)]",
  };

  const statusText: Record<string, string> = {
    red: "font-medium text-[#c9a84c]",
    yellow: "font-medium text-[#c9a84c]/90",
    green: "font-medium text-[#a8904a]",
  };

  return (
    <div className="min-h-0 space-y-8 text-[#f0f0f0]">
      {!user?.onboardingDone ? <OnboardingWizard /> : null}

      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#2a2a2a] pb-4">
        <div className="space-y-1">
          <h1 className="page-title">Command center</h1>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#888888]">
            Recruiting hub · {user?.name ?? "Analyst"}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-right font-mono text-[11px] text-[#888888]">
          <span>
            STRK <span className="text-[#c9a84c]">{user?.drillStreak ?? 0}</span>
          </span>
          <span>
            XP <span className="text-[#f5f5f5]">{user?.xp ?? 0}</span>
          </span>
          <span>
            WXP <span className="text-[#4a6fa5]">{user?.weeklyXP ?? 0}</span>
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
                <p className="text-sm text-[#888888]">No touchpoints yet. Log coffee chats to populate.</p>
              ) : (
                followUpAlerts.map((alert) => (
                  <div
                    key={`${alert.contactId}-${alert.label}`}
                    className={cn(
                      "rounded-r-md border border-[#2a2a2a] py-2 pl-2.5 pr-2",
                      statusStyles[alert.status],
                    )}
                  >
                    <p className="font-semibold text-[#f0f0f0]">{alert.contactName}</p>
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
                    <p className="text-[10px] text-[#888888]">
                      Due {alert.dueAt.toLocaleDateString()} · {alert.status.toUpperCase()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-3">
            <p className="section-label">Cold contacts</p>
            <p className="mt-0.5 text-[10px] text-[#888888]">
              HOT / ADVOCATE with no touch in 45+ days — high-value relationships slipping.
            </p>
            <div className="mt-2 max-h-[180px] space-y-1.5 overflow-y-auto pr-1 text-[11px]">
              {coldContacts.length === 0 ? (
                <p className="text-[#888888]">None right now.</p>
              ) : (
                coldContacts.map((c) => (
                  <Link
                    key={c.id}
                    href={`/contacts/${c.id}`}
                    className="block rounded-md border border-[#2a2a2a] bg-[#141414] px-2 py-1.5 transition-all hover:border-[#c9a84c]/35 hover:bg-[#1a1a1a]"
                  >
                    <p className="font-semibold text-[#f0f0f0]">{c.fullName}</p>
                    <p className="text-[10px] text-[#888888]">
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
                <p className="text-sm text-[#888888]">No upcoming items. Add events on Calendar.</p>
              ) : (
                upcomingItems.map((u) => (
                  <div
                    key={u.key}
                    className="flex items-center justify-between gap-2 rounded-md border border-[#2a2a2a] bg-[#141414] px-2 py-1.5 transition-all hover:border-[#3a3a3a]"
                  >
                    <span className="min-w-0 truncate font-medium text-[#f0f0f0]">{u.title}</span>
                    <span className="shrink-0 text-[10px] text-[#888888]">
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
              <div className="rounded-lg border border-[#2a2a2a] border-l-2 border-l-[#c9a84c] bg-[#161616] p-2.5 transition-colors hover:border-[#3a3a3a]">
                <p className="text-[10px] uppercase tracking-wide text-[#888888]">Streak</p>
                <p className="text-base font-semibold tabular-nums text-[#f5f5f5]">{user?.drillStreak ?? 0}</p>
              </div>
              <div className="rounded-lg border border-[#2a2a2a] border-l-2 border-l-[#f5f5f5] bg-[#161616] p-2.5 transition-colors hover:border-[#3a3a3a]">
                <p className="text-[10px] uppercase tracking-wide text-[#888888]">Mastered</p>
                <p className="text-base font-semibold tabular-nums text-[#f0f0f0]">{knownCount}</p>
              </div>
              <div className="rounded-lg border border-[#2a2a2a] border-l-2 border-l-[#4a6fa5] bg-[#161616] p-2.5 transition-colors hover:border-[#3a3a3a]">
                <p className="text-[10px] uppercase tracking-wide text-[#888888]">Contacts +wk</p>
                <p className="text-base font-semibold tabular-nums text-[#4a6fa5]">{contactsThisWeek}</p>
              </div>
            </div>
          </Card>

          <DashboardRecruitingCountdown
            userId={userId}
            targets={calendarVerticalsFromProfile(user?.careerTracks ?? [], user?.recruitingTarget ?? [])}
          />

          <Card className="p-3">
            <p className="section-label">Pipeline snapshot</p>
            <div className="mt-2 space-y-1 text-[11px]">
              {pipeline.map((p) => (
                <div key={p.stage} className="flex items-center justify-between">
                  <span className="text-[#888888]">{STAGE_LABELS[p.stage]}</span>
                  <span className="font-semibold text-[#f5f5f5]">{p._count._all}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
