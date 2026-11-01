import Link from "next/link";
import { subDays, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ThemeSetting } from "@/components/theme/theme-setting";
import { ProfileDrillChart } from "@/components/profile-drill-chart";
import { ProfileNameForm } from "@/components/profile-name-form";
import { CalendarIntegrationPanel } from "@/components/calendar-integration-panel";
import { ProfileTracksForm } from "@/components/profile-tracks-form";
import { ProfileReferralCard } from "@/components/profile-referral-card";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ referredBy?: string }> }) {
  const params = await searchParams;
  const userId = await requireUserId();
  const since = subDays(new Date(), 29);

  const [user, drillLogs, byCategory, pendingCount, submittedActive, joinedCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        xp: true,
        weeklyXP: true,
        drillStreak: true,
        recruitingTarget: true,
        careerTracks: true,
        targetFirms: true,
        dailyGoal: true,
        referralCode: true,
      },
    }),
    prisma.dailyDrillLog.findMany({
      where: { userId, date: { gte: format(since, "yyyy-MM-dd") } },
      orderBy: { date: "asc" },
    }),
    prisma.userQuestionProgress.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.question.count({ where: { submittedById: userId, status: "pending" } }),
    prisma.question.count({ where: { submittedById: userId, status: "active" } }),
    prisma.referral.count({ where: { referrerId: userId, status: "completed" } }),
  ]);

  const knownByCat = await prisma.userQuestionProgress.findMany({
    where: { userId, status: "known" },
    include: { question: { select: { category: true, status: true } } },
  });
  const catMap = new Map<string, number>();
  for (const row of knownByCat) {
    if (row.question.status !== "active") continue;
    const c = row.question.category;
    catMap.set(c, (catMap.get(c) ?? 0) + 1);
  }

  const dayKeys = Array.from({ length: 30 }, (_, i) => format(subDays(new Date(), 29 - i), "yyyy-MM-dd"));
  const logMap = new Map(drillLogs.map((l) => [l.date, l.questionsAnswered]));
  const chartData = dayKeys.map((d) => ({
    date: d.slice(5),
    answered: logMap.get(d) ?? 0,
  }));

  const statusMap = Object.fromEntries(byCategory.map((g) => [g.status, g._count._all])) as Record<
    string,
    number
  >;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Your profile, appearance, and connected calendars." />
      <Card title="Appearance">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-2">Theme</p>
          <ThemeSetting />
        </div>
      </Card>
      <Card title="PE@Broad sharing" action={<Link href="/settings/club-sharing" className="text-accent hover:underline">Edit</Link>}>
        <p className="text-sm text-ink-2">Choose what other club members see: learning progress, drill stats, targets, and firms in contact.</p>
      </Card>
      {params.referredBy ? (
        <p className="rounded border border-success/40 bg-success-bg px-3 py-2 text-sm text-success">
          You joined via {params.referredBy}&apos;s invite.
        </p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="border-border bg-surface p-4">
          <p className="text-sm font-semibold text-ink">Account</p>
          <p className="mt-2 text-sm text-ink-2">{user?.email}</p>
          <ProfileNameForm initialName={user?.name ?? ""} />
        </Card>

        <Card className="border-border bg-surface p-4">
          <p className="text-sm font-semibold text-ink">Career tracks</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(user?.careerTracks ?? []).map((track) => (
              <span key={track} className="rounded-full border border-border-strong bg-surface px-2 py-0.5 text-xs text-ink-2">
                {track}
              </span>
            ))}
          </div>
          <ProfileTracksForm initialTracks={user?.careerTracks ?? []} />
        </Card>

        <Card className="border-border bg-surface p-4">
          <p className="text-sm font-semibold text-ink">Engagement</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded border border-border bg-black/30 p-2">
              <p className="text-[10px] text-ink-3">Total XP</p>
              <p className="text-lg font-mono text-ink">{user?.xp ?? 0}</p>
            </div>
            <div className="rounded border border-border bg-black/30 p-2">
              <p className="text-[10px] text-ink-3">Weekly XP</p>
              <p className="text-lg font-mono text-accent">{user?.weeklyXP ?? 0}</p>
            </div>
            <div className="rounded border border-border bg-black/30 p-2">
              <p className="text-[10px] text-ink-3">Streak</p>
              <p className="text-lg font-mono text-warn">{user?.drillStreak ?? 0}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-3">
            Daily goal: {user?.dailyGoal ?? 5} questions · Legacy targets: {(user?.recruitingTarget ?? []).join(", ") || "—"}
          </p>
        </Card>
      </div>

      <CalendarIntegrationPanel callbackUrl="/profile" className="border-border bg-surface" />
      <ProfileReferralCard code={user?.referralCode ?? "INVITE"} joinedCount={joinedCount} xpEarned={joinedCount * 200} />

      <Card className="border-border bg-surface p-4">
        <p className="text-sm font-semibold text-ink">Questions mastered by category</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {Array.from(catMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([cat, n]) => (
              <div key={cat} className="flex items-center justify-between rounded border border-border px-2 py-1.5 text-xs">
                <span className="text-ink-2">{cat}</span>
                <span className="font-mono text-success">{n}</span>
              </div>
            ))}
        </div>
        <p className="mt-3 text-xs text-ink-3">
          Progress snapshot: known {statusMap.known ?? 0}, review {statusMap.review ?? 0}, unseen{" "}
          {statusMap.unseen ?? 0}
        </p>
      </Card>

      <Card className="border-border bg-surface p-4">
        <p className="text-sm font-semibold text-ink">Daily drill (last 30 days)</p>
        <ProfileDrillChart data={chartData} />
      </Card>

      <Card className="border-border bg-surface p-4">
        <p className="text-sm font-semibold text-ink">Question submissions</p>
        <p className="mt-2 text-xs text-ink-2">
          Pending review: {pendingCount} · Approved in bank: {submittedActive}
        </p>
      </Card>
    </div>
  );
}
