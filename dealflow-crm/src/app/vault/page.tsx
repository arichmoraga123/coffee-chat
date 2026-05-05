import { requireUserId } from "@/lib/auth";
import { VaultView } from "@/components/vault-view";

export const dynamic = "force-dynamic";

export default async function VaultPage() {
  await requireUserId();
  return <VaultView />;
}
