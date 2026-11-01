import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { DailySet } from "@/components/practice/daily-set";

export const dynamic = "force-dynamic";
export const metadata = { title: "Daily set" };

export default async function DailySetPage() {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { drillStreak: true } });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily set"
        subtitle="5 questions a day. Missed questions come back after 1, 3 and 7 days; the rest come from your weakest lessons."
      />
      <DailySet initialStreak={user?.drillStreak ?? 0} />
    </div>
  );
}
