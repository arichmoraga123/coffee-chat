import { requireAdminUserId } from "@/lib/auth";
import { CompDataExplorer } from "@/components/comp-data-explorer";

export const dynamic = "force-dynamic";

export default async function CompPage() {
  await requireAdminUserId();
  return <CompDataExplorer loggedIn={true} />;
}
