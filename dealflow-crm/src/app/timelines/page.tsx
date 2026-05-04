import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { TimelinesView, type TimelineRow } from "@/components/timelines-view";

export const dynamic = "force-dynamic";

export default async function TimelinesPage({
  searchParams,
}: {
  searchParams: Promise<{ firmType?: string; role?: string; year?: string }>;
}) {
  const userId = await requireUserId();
  const sp = await searchParams;
  const firmType = sp.firmType ?? "all";
  const role = sp.role ?? "all";
  const yearStr = sp.year ?? "2026";

  const where: Record<string, unknown> = {};
  if (firmType !== "all") where.firmType = firmType;
  if (role !== "all") where.role = role;
  if (yearStr !== "all") where.year = Number(yearStr);

  const timelines = await prisma.firmTimeline.findMany({
    where,
    orderBy: [{ upvotes: "desc" }, { firmName: "asc" }],
    include: {
      votes: { where: { userId }, select: { id: true } },
    },
  });

  const initial: TimelineRow[] = timelines.map((t) => ({
    id: t.id,
    firmName: t.firmName,
    firmType: t.firmType,
    role: t.role,
    applicationOpen: t.applicationOpen?.toISOString() ?? null,
    applicationClose: t.applicationClose?.toISOString() ?? null,
    firstRound: t.firstRound?.toISOString() ?? null,
    finalRound: t.finalRound?.toISOString() ?? null,
    offerDate: t.offerDate?.toISOString() ?? null,
    year: t.year,
    notes: t.notes,
    verified: t.verified,
    upvotes: t.upvotes,
    hasVoted: t.votes.length > 0,
  }));

  return (
    <TimelinesView
      key={`${firmType}-${role}-${yearStr}`}
      initial={initial}
      defaultFirmType={firmType}
      defaultRole={role}
      defaultYear={yearStr}
    />
  );
}
