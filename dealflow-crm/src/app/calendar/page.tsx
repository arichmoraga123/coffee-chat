import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { CalendarView } from "@/components/calendar-view";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const userId = await requireUserId();
  const [events, coffee] = await Promise.all([
    prisma.recruitingEvent.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    }),
    prisma.interaction.findMany({
      where: { userId, type: "COFFEE_CHAT" },
      orderBy: { date: "asc" },
      include: { contact: { select: { fullName: true } } },
    }),
  ]);

  return (
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
    />
  );
}
