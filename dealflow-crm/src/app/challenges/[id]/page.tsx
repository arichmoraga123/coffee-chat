import { requireUserId } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { ChallengeRoom } from "@/components/challenges/challenge-room";

export const dynamic = "force-dynamic";
export const metadata = { title: "Challenge" };

export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  return (
    <div className="space-y-6">
      <PageHeader crumbs={[{ label: "Challenges", href: "/challenges" }, { label: "Challenge" }]} title="Challenge" />
      <ChallengeRoom id={id} me={userId} />
    </div>
  );
}
