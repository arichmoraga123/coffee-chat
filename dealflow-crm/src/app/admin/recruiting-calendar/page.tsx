import { requireAdminUserId } from "@/lib/auth";
import { AdminRecruitingCalendarManager } from "@/components/admin-recruiting-calendar-manager";

export const dynamic = "force-dynamic";

export default async function AdminRecruitingCalendarPage() {
  await requireAdminUserId();
  return <AdminRecruitingCalendarManager />;
}
