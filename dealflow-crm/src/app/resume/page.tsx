import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ResumeReviewView } from "@/components/resume-review-view";
import { ResumeReviewV2 } from "@/components/resume/resume-review-v2";
import { levelFromGradYear, targetFromTrack } from "@/lib/resume/rubric";
import { getPrimaryTrack } from "@/lib/track-utils";

export const dynamic = "force-dynamic";

export default async function ResumePage() {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { careerTracks: true, classYear: true },
  });
  if (process.env.RESUME_V2?.trim().toLowerCase() === "true") {
    return (
      <ResumeReviewV2
        defaultLevel={levelFromGradYear(user?.classYear) ?? "Sophomore"}
        defaultTarget={targetFromTrack(getPrimaryTrack(user?.careerTracks ?? []))}
      />
    );
  }
  return <ResumeReviewView careerTracks={user?.careerTracks ?? []} />;
}
