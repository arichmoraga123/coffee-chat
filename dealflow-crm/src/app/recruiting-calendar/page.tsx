import { requireUserId } from "@/lib/auth";
import { RecruitingCalendarTabs } from "@/components/recruiting-calendar-tabs";

export const dynamic = "force-dynamic";

export default async function RecruitingCalendarPage() {
  await requireUserId();
  return <RecruitingCalendarTabs />;
}
