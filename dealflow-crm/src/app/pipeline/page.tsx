import { prisma } from "@/lib/prisma";
import { PipelineBoard } from "@/components/pipeline-board";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const userId = await requireUserId();
  const [opps, firms, me] = await Promise.all([
    prisma.opportunity.findMany({
      where: { userId },
      include: {
        firm: true,
        contacts: { include: { contact: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.firm.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { customRoles: true } }),
  ]);

  return (
    <PipelineBoard
      firms={firms}
      customRoles={me?.customRoles ?? []}
      groups={[...new Set(opps.map((o) => o.group).filter((g): g is string => Boolean(g)))]}
      locations={[...new Set(opps.map((o) => o.location).filter((g): g is string => Boolean(g)))]}
      initial={opps.map((o) => ({
        id: o.id,
        stage: o.stage,
        role: o.role,
        firmId: o.firm.id,
        firmName: o.firm.name,
        firmType: o.firm.type,
        applicationDeadline: o.applicationDeadline
          ? o.applicationDeadline.toISOString().slice(0, 10)
          : null,
        contactName: o.contactName,
        notes: o.notes,
        linkedContactNames: o.contacts.map((c) => c.contact.fullName),
        group: o.group,
        location: o.location,
        contacts: o.contacts.map((c) => ({ id: c.contact.id, name: c.contact.fullName })),
      }))}
    />
  );
}
