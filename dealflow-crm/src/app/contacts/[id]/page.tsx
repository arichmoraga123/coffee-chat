import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContactDetailView } from "@/components/contact-detail-view";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ContactDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();
  const contact = await prisma.contact.findFirst({
    where: { id, userId },
    include: {
      firm: true,
      interactions: { orderBy: { date: "desc" } },
      tasks: { orderBy: { dueDate: "asc" } },
      opportunities: { include: { opportunity: { include: { firm: true } } } },
    },
  });
  if (!contact) return notFound();

  const allOpportunities = await prisma.opportunity.findMany({
    where: { userId },
    include: { firm: true },
    orderBy: { createdAt: "desc" },
  });
  const linkedIds = new Set(contact.opportunities.map((oc) => oc.opportunityId));

  return (
    <ContactDetailView
      contact={{
        id: contact.id,
        fullName: contact.fullName,
        title: contact.title,
        group: contact.group,
        firmName: contact.firm.name,
        email: contact.email,
        location: contact.location,
        notes: contact.notes,
      }}
      interactions={contact.interactions.map((i) => ({
        id: i.id,
        date: i.date.toISOString(),
        type: i.type,
        notes: i.notes,
        keyTakeaways: i.keyTakeaways,
      }))}
      tasks={contact.tasks.map((t) => ({
        id: t.id,
        taskType: t.taskType,
        dueDate: t.dueDate.toISOString(),
        status: t.status,
      }))}
      opportunities={contact.opportunities.map((oc) => ({
        id: oc.opportunityId,
        label: `${oc.opportunity.firm.name} - ${oc.opportunity.role} (${oc.opportunity.stage})`,
      }))}
      linkableOpportunities={allOpportunities
        .filter((o) => !linkedIds.has(o.id))
        .map((o) => ({
          id: o.id,
          label: `${o.firm.name} - ${o.role} (${o.stage})`,
        }))}
    />
  );
}
