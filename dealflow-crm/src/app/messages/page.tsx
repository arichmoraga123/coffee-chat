import { requireUserId } from "@/lib/auth";
import { peBroadMembership } from "@/lib/club-social";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { MessagesApp } from "@/components/messages/messages-app";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages" };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const userId = await requireUserId();
  const m = await peBroadMembership(userId);
  const { c } = await searchParams;
  return (
    <div className="space-y-6">
      <PageHeader title="Messages" subtitle="Direct messages with PE@Broad members." />
      {m ? <MessagesApp me={userId} initialId={c ?? null} /> : <EmptyState title="Messages are for PE@Broad members." />}
    </div>
  );
}
