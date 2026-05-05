import { requireUserId } from "@/lib/auth";
import { GroupsView } from "@/components/groups-view";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  await requireUserId();
  return <GroupsView />;
}
