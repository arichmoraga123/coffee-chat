import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { CalendarView } from "@/components/calendar-view";
import { CalendarIntegrationPanel } from "@/components/calendar-integration-panel";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const userId = await requireUserId();
  const now = new Date();
  const horizon = addDays(now, 30);
  const [events, coffee, recruitingSeason] = await Promise.all([
    prisma.recruitingEvent.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    }),
    prisma.interaction.findMany({
      where: { userId, type: "COFFEE_CHAT" },
      orderBy: { date: "asc" },
      include: { contact: { select: { fullName: true } } },
    }),
    prisma.recruitingCalendarEvent.findMany({
      where: { date: { gte: now, lte: horizon } },
      orderBy: { date: "asc" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <CalendarIntegrationPanel />
      <CalendarView
        initialEvents={events.map((e) => ({
          id: e.id,
          title: e.title,
          date: e.date.toISOString(),
          type: e.type,
          firmName: e.firmName,
          notes: e.notes,
        }))}
        initialCoffee={coffee.map((c) => ({
          id: c.id,
          date: c.date.toISOString(),
          label: `Coffee · ${c.contact.fullName}`,
        }))}
        recruitingSeasonEvents={recruitingSeason.map((e) => ({
          id: e.id,
          title: e.title,
          firmName: e.firmName,
          eventType: e.eventType,
          date: e.date.toISOString(),
        }))}
      />
    </div>
  );
}
