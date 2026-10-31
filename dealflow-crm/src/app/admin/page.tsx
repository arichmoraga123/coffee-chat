import { requireAdminUserId } from "@/lib/auth";
import { AdminDashboard } from "@/components/admin-dashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdminUserId();
  return <AdminDashboard />;
}
