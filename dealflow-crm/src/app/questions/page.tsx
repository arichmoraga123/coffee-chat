import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { QuestionsBank } from "@/components/questions-bank";

export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  const userId = await requireUserId();
  const [questions, progressRows, user] = await Promise.all([
    prisma.question.findMany({
      orderBy: [{ category: "asc" }, { question: "asc" }],
      select: {
        id: true,
        question: true,
        answer: true,
        category: true,
        subcategory: true,
        difficulty: true,
        tags: true,
      },
    }),
    prisma.userQuestionProgress.findMany({
      where: { userId },
      select: { questionId: true, status: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { drillStreak: true },
    }),
  ]);

  const initialProgress: Record<string, "known" | "review" | "unseen"> = {};
  progressRows.forEach((p) => {
    if (p.status === "known" || p.status === "review" || p.status === "unseen") {
      initialProgress[p.questionId] = p.status;
    }
  });

  return (
    <QuestionsBank
      questions={questions}
      initialProgress={initialProgress}
      drillStreak={user?.drillStreak ?? 0}
    />
  );
}
