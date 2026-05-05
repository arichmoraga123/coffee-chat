import { requireUserId } from "@/lib/auth";
import { RecruitingSeasonCalendarView } from "@/components/recruiting-season-calendar-view";

export const dynamic = "force-dynamic";

export default async function RecruitingCalendarPage() {
  await requireUserId();
  return <RecruitingSeasonCalendarView />;
}
