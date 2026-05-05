import { requireUserId } from "@/lib/auth";
import { ResumeReviewView } from "@/components/resume-review-view";

export const dynamic = "force-dynamic";

export default async function ResumePage() {
  await requireUserId();
  return <ResumeReviewView />;
}
