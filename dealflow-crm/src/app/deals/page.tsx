import { requireUserId } from "@/lib/auth";
import { DealsView } from "@/components/deals-view";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  await requireUserId();
  return <DealsView />;
}
