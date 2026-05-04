import { startOfDay, endOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { STAGE_LABELS } from "@/lib/constants";
import { requireUserId } from "@/lib/auth";
import { getFollowUpSteps } from "@/lib/follow-up";

export const dynamic = "force-dynamic";

export default async function Home() {
  const userId = await requireUserId();
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  const [
    totalContacts,
    warmContacts,
    activeOpportunities,
    tasksDueToday,
    recentInteractions,
    pipeline,
    contactsForFollowUps,
  ] =
    await Promise.all([
      prisma.contact.count({ where: { userId } }),
      prisma.contact.count({ where: { userId, relationshipStrength: { gte: 7 } } }),
      prisma.opportunity.count({ where: { userId, stage: { notIn: ["OFFER", "REJECTED"] } } }),
      prisma.task.count({
        where: { userId, dueDate: { gte: todayStart, lte: todayEnd }, status: "PENDING" },
      }),
      prisma.interaction.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        take: 5,
        include: { contact: true },
      }),
      prisma.opportunity.groupBy({ by: ["stage"], where: { userId }, _count: { _all: true } }),
      prisma.contact.findMany({
        where: { userId },
        select: { id: true, fullName: true, lastInteractionDate: true },
      }),
    ]);

  const followUpAlerts = contactsForFollowUps
    .flatMap((contact) => {
      if (!contact.lastInteractionDate) return [];
      return getFollowUpSteps(contact.lastInteractionDate).map((step) => ({
        contactId: contact.id,
        contactName: contact.fullName,
        label: step.label,
        dueAt: step.dueAt,
        isOverdue: step.isOverdue,
      }));
    })
    .sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.dueAt.getTime() - b.dueAt.getTime();
    })
    .slice(0, 8);

  const metrics = [
    ["Total Contacts", totalContacts],
    ["Warm Contacts", warmContacts],
    ["Active Opportunities", activeOpportunities],
    ["Tasks Due Today", tasksDueToday],
  ] as const;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <div className="grid gap-3 md:grid-cols-4">
        {metrics.map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-400">{label}</p>
            <p className="mt-1 text-2xl font-bold text-cyan-400">{value}</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4 md:col-span-2">
          <h2 className="mb-2 text-sm font-semibold">Coffee Chat Follow-up Alerts</h2>
          <div className="space-y-2 text-sm">
            {followUpAlerts.length === 0 ? (
              <p className="text-zinc-400">No follow-up alerts yet. Log interactions to start reminders.</p>
            ) : (
              followUpAlerts.map((alert) => (
                <div key={`${alert.contactId}-${alert.label}`} className="rounded border border-zinc-800 p-2">
                  <p className="font-medium">{alert.contactName}</p>
                  <p className={alert.isOverdue ? "text-red-300" : "text-amber-300"}>
                    {alert.label} - {alert.isOverdue ? "Overdue" : "Upcoming"}
                  </p>
                  <p className="text-xs text-zinc-400">Due {alert.dueAt.toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold">Recent Interactions</h2>
          <div className="space-y-2 text-sm">
            {recentInteractions.map((i) => (
              <div key={i.id} className="rounded border border-zinc-800 p-2">
                <p className="font-medium">{i.contact.fullName}</p>
                <p className="text-zinc-400">{i.type.replace("_", " ")}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold">Pipeline Snapshot</h2>
          <div className="space-y-1 text-sm">
            {pipeline.map((p) => (
              <div key={p.stage} className="flex items-center justify-between">
                <span>{STAGE_LABELS[p.stage]}</span>
                <span className="font-semibold text-cyan-400">{p._count._all}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
