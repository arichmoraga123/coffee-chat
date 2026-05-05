import { prisma } from "@/lib/prisma";
import { PipelineBoard } from "@/components/pipeline-board";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const userId = await requireUserId();
  const [opps, firms] = await Promise.all([
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
  ]);

  return (
    <PipelineBoard
      firms={firms}
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
      }))}
    />
  );
}
