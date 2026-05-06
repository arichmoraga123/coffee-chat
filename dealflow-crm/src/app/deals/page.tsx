import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { DealsView } from "@/components/deals-view";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const userId = await requireUserId();
  const [deals, marks] = await Promise.all([
    prisma.deal.findMany({
      where: { status: "published" },
      orderBy: { announcedAt: "desc" },
      take: 500,
      select: {
        id: true,
        title: true,
        acquirer: true,
        target: true,
        dealValue: true,
        dealType: true,
        vertical: true,
        sector: true,
        summary: true,
        keyThesis: true,
        risks: true,
        sourceUrl: true,
        announcedAt: true,
        careerTracks: true,
      },
    }),
    prisma.dealBookmark.findMany({
      where: { userId },
      select: { dealId: true, notes: true },
    }),
  ]);
  const bookmarkMap = Object.fromEntries(marks.map((m) => [m.dealId, m.notes]));

  return (
    <DealsView
      initialDeals={deals.map((d) => ({
        ...d,
        announcedAt: d.announcedAt.toISOString(),
        careerTracks: d.careerTracks ?? [],
      }))}
      initialBookmarks={bookmarkMap}
    />
  );
}
