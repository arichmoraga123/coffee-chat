import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { QuestionsBank } from "@/components/questions-bank";
import { QuestionSubmitDialog } from "@/components/question-submit-dialog";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function QuestionsPage({ searchParams }: { searchParams: Promise<{ tags?: string }> }) {
  const { tags } = await searchParams;
  const userId = await requireUserId();
  const [questions, progressRows, user] = await Promise.all([
    prisma.question.findMany({
      where: { status: "active" },
      orderBy: [{ category: "asc" }, { question: "asc" }],
      select: {
        id: true,
        question: true,
        answer: true,
        category: true,
        subcategory: true,
        difficulty: true,
        tags: true,
        keywords: true,
        careerTracks: true,
      },
    }),
    prisma.userQuestionProgress.findMany({
      where: { userId },
      select: { questionId: true, status: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { drillStreak: true, xp: true, weeklyXP: true },
    }),
  ]);

  const initialProgress: Record<string, "known" | "review" | "unseen"> = {};
  progressRows.forEach((p) => {
    if (p.status === "known" || p.status === "review" || p.status === "unseen") {
      initialProgress[p.questionId] = p.status;
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <QuestionSubmitDialog />
      </div>
      <QuestionsBank
        questions={questions}
        initialProgress={initialProgress}
        drillStreak={user?.drillStreak ?? 0}
        weeklyXP={user?.weeklyXP ?? 0}
        totalXP={user?.xp ?? 0}
        initialTagFilter={typeof tags === "string" ? tags.slice(0, 200) : ""}
      />

    </div>
  );
}
