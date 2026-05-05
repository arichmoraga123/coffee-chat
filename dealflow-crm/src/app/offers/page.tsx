import { requireUserId } from "@/lib/auth";
import { OffersView } from "@/components/offers-view";

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  await requireUserId();
  return <OffersView />;
}
