import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { startConversation } from "@/lib/dm";
import { EmptyState } from "@/components/ui/empty-state";

export const dynamic = "force-dynamic";

export default async function NewMessagePage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const userId = await requireUserId();
  const { to } = await searchParams;
  if (!to) redirect("/messages");
  const r = await startConversation(userId, to);
  if ("error" in r) return <EmptyState title={r.error} />;
  redirect(`/messages?c=${r.id}`);
}
