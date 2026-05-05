import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { FirmsDirectory } from "@/components/firms-directory";

export const dynamic = "force-dynamic";

export default async function FirmsPage() {
  const userId = await requireUserId();
  const firms = await prisma.firm.findMany({
    where: { userId },
    include: { _count: { select: { contacts: true, opportunities: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <FirmsDirectory
      initialFirms={firms.map((f) => ({
        id: f.id,
        name: f.name,
        type: f.type,
        location: f.location,
        contacts: f._count.contacts,
        opportunities: f._count.opportunities,
      }))}
    />
  );
}
