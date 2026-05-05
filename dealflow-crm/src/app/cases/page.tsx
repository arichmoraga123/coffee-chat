import { requireUserId } from "@/lib/auth";
import { CasesView } from "@/components/cases-view";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  await requireUserId();
  return <CasesView />;
}
