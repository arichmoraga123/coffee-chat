import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { ResearchFirmDetail } from "@/components/research-firm-detail";

export const dynamic = "force-dynamic";

export default async function ResearchFirmPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUserId();
  const { id } = await params;
  const firm = await prisma.firmResearch.findUnique({ where: { id } });
  if (!firm) return notFound();
  const deals = await prisma.deal.findMany({
    where: {
      status: "published",
      OR: [
        { acquirer: { contains: firm.firmName, mode: "insensitive" } },
        { target: { contains: firm.firmName, mode: "insensitive" } },
        { title: { contains: firm.firmName, mode: "insensitive" } },
      ],
    },
    orderBy: { announcedAt: "desc" },
    take: 20,
  });
  return (
    <ResearchFirmDetail
      initial={firm}
      relatedDeals={deals.map((d) => ({
        id: d.id,
        title: d.title,
        dealValue: d.dealValue,
        announcedAt: d.announcedAt.toISOString(),
      }))}
    />
  );
}
