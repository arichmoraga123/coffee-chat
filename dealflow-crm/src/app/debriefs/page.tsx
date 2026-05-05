import { requireUserId } from "@/lib/auth";
import { DebriefsView } from "@/components/debriefs-view";

export const dynamic = "force-dynamic";

export default async function DebriefsPage() {
  await requireUserId();
  return <DebriefsView />;
}
