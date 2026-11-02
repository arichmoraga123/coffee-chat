import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { GroupFinder } from "@/components/fit/group-finder";
import { getGroupFinderData } from "@/lib/fit-content";
import type { GroupMatch } from "@/lib/groupFinder";

export const dynamic = "force-dynamic";
export const metadata = { title: "Group Finder" };

export default async function GroupFinderPage() {
  const userId = await requireUserId();
  const [data, history, user] = await Promise.all([
    getGroupFinderData(),
    prisma.groupFinderResult.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, createdAt: true, results: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { recruitingTarget: true } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader title="Storybank" subtitle="The 3-minute Group Finder: which coverage and product groups fit how you think. A starting point, not a verdict." />
      <GroupFinder
        data={data}
        history={history.map((h) => ({ id: h.id, createdAt: h.createdAt.toISOString(), results: h.results as unknown as GroupMatch[] }))}
        targets={user?.recruitingTarget ?? []}
      />
    </div>
  );
}
