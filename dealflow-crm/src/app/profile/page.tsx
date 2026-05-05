import { subDays, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { ProfileDrillChart } from "@/components/profile-drill-chart";
import { ProfileNameForm } from "@/components/profile-name-form";
import { CalendarIntegrationPanel } from "@/components/calendar-integration-panel";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const userId = await requireUserId();
  const since = subDays(new Date(), 29);

  const [user, drillLogs, byCategory, pendingCount, submittedActive] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        xp: true,
        weeklyXP: true,
        drillStreak: true,
        recruitingTarget: true,
        targetFirms: true,
        dailyGoal: true,
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
    <div className="space-y-4">
      <h1 className="page-title">Profile</h1>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm font-semibold text-zinc-200">Account</p>
          <p className="mt-2 text-sm text-zinc-400">{user?.email}</p>
          <ProfileNameForm initialName={user?.name ?? ""} />
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm font-semibold text-zinc-200">Engagement</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded border border-zinc-800 bg-black/30 p-2">
              <p className="text-[10px] text-zinc-500">Total XP</p>
              <p className="text-lg font-mono text-[#f5f5f5]">{user?.xp ?? 0}</p>
            </div>
            <div className="rounded border border-zinc-800 bg-black/30 p-2">
              <p className="text-[10px] text-zinc-500">Weekly XP</p>
              <p className="text-lg font-mono text-[#c9a84c]">{user?.weeklyXP ?? 0}</p>
            </div>
            <div className="rounded border border-zinc-800 bg-black/30 p-2">
              <p className="text-[10px] text-zinc-500">Streak</p>
              <p className="text-lg font-mono text-orange-400">{user?.drillStreak ?? 0}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Daily goal: {user?.dailyGoal ?? 5} questions · Targets: {(user?.recruitingTarget ?? []).join(", ") || "—"}
          </p>
        </Card>
      </div>

      <CalendarIntegrationPanel callbackUrl="/profile" className="border-zinc-800 bg-zinc-900/50" />

      <Card className="border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-sm font-semibold text-zinc-200">Questions mastered by category</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {Array.from(catMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([cat, n]) => (
              <div key={cat} className="flex items-center justify-between rounded border border-zinc-800 px-2 py-1.5 text-xs">
                <span className="text-zinc-300">{cat}</span>
                <span className="font-mono text-emerald-400">{n}</span>
              </div>
            ))}
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Progress snapshot: known {statusMap.known ?? 0}, review {statusMap.review ?? 0}, unseen{" "}
          {statusMap.unseen ?? 0}
        </p>
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-sm font-semibold text-zinc-200">Daily drill (last 30 days)</p>
        <ProfileDrillChart data={chartData} />
      </Card>

      <Card className="border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-sm font-semibold text-zinc-200">Question submissions</p>
        <p className="mt-2 text-xs text-zinc-400">
          Pending review: {pendingCount} · Approved in bank: {submittedActive}
        </p>
      </Card>
    </div>
  );
}
