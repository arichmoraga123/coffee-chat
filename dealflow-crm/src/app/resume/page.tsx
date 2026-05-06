import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ResumeReviewView } from "@/components/resume-review-view";

export const dynamic = "force-dynamic";

export default async function ResumePage() {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { careerTracks: true },
  });
  return <ResumeReviewView careerTracks={user?.careerTracks ?? []} />;
}
