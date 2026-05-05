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
      }))}
      initialBookmarks={bookmarkMap}
    />
  );
}
