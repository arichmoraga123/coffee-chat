import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { SharingControls } from "@/components/club/sharing-controls";

export const dynamic = "force-dynamic";
export const metadata = { title: "Club sharing" };

export default async function ClubSharingPage() {
  const userId = await requireUserId();
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { shareLearning: true, shareDrill: true, shareTargets: true, shareFirms: true, classYear: true },
  });
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader crumbs={[{ label: "Settings", href: "/profile" }, { label: "Club sharing" }]} title="Club sharing" subtitle="Choose what other PE@Broad members can see on your profile." />
      <SharingControls initial={u} />
    </div>
  );
}
