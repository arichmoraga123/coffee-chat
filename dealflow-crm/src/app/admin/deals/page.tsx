import { prisma } from "@/lib/prisma";
import { AdminDealsView } from "@/components/admin-deals-view";

export const dynamic = "force-dynamic";

export default async function AdminDealsPage() {
  const deals = await prisma.deal.findMany({
    orderBy: { announcedAt: "desc" },
    take: 500,
  });

  return (
    <AdminDealsView
      initialDeals={deals.map((d) => ({
        ...d,
        announcedAt: d.announcedAt.toISOString(),
      }))}
    />
  );
}
