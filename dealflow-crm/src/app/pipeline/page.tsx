import { prisma } from "@/lib/prisma";
import { PipelineBoard } from "@/components/pipeline-board";
import { requireUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const userId = await requireUserId();
  const opps = await prisma.opportunity.findMany({
    where: { userId },
    include: {
      firm: true,
      contacts: { include: { contact: true } },
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Pipeline</h1>
      <PipelineBoard
        initial={opps.map((o) => ({
          id: o.id,
          stage: o.stage,
          role: o.role,
          priority: o.priority,
          firmName: o.firm.name,
          contacts: o.contacts.map((c) => c.contact.fullName),
        }))}
      />
    </div>
  );
}
