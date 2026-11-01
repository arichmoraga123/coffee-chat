import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { Storybank } from "@/components/stories/storybank";
import type { PolishedStory, StoryQuestion } from "@/lib/storybank";

export const dynamic = "force-dynamic";
export const metadata = { title: "Storybank" };

export default async function StoriesPage() {
  const userId = await requireUserId();
  const stories = await prisma.story.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Storybank"
        subtitle="Six stories cover almost every behavioral question. Dump what happened, and the AI turns it into a clean interview answer and shows which questions it answers."
      />
      <Storybank
        initial={stories.map((s) => ({
          id: s.id,
          slot: s.slot,
          title: s.title,
          rawText: s.rawText,
          polished: s.polished as (PolishedStory & { followUps?: string[] }) | null,
          questions: (s.questions as StoryQuestion[]) ?? [],
          feedback: s.feedback,
        }))}
      />
    </div>
  );
}
