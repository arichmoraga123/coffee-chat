import { requireUserId } from "@/lib/auth";
import { GroupDetailView } from "@/components/group-detail-view";

export const dynamic = "force-dynamic";

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUserId();
  const { id } = await params;
  return <GroupDetailView groupId={id} />;
}
