import { requireAdminUserId } from "@/lib/auth";
import { AdminQuestionsPanel } from "@/components/admin-questions-panel";

export const dynamic = "force-dynamic";

export default async function AdminQuestionsPage() {
  await requireAdminUserId();
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Admin · Questions</h1>
      <AdminQuestionsPanel />
    </div>
  );
}
