import { requireUserId } from "@/lib/auth";
import { RecruitingRoadmap } from "@/components/recruiting-roadmap";

export const dynamic = "force-dynamic";

export default async function RoadmapPage() {
  await requireUserId();
  return <RecruitingRoadmap />;
}
