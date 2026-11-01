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
  const [questions, progressRows, user, leaderboard] = await Promise.all([
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
    prisma.user.findMany({
      orderBy: [{ weeklyXP: "desc" }, { xp: "desc" }],
      select: { id: true, name: true, weeklyXP: true, xp: true, drillStreak: true },
      take: 50,
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

      <Card className="border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Weekly leaderboard</h2>
        <p className="mb-3 text-xs text-ink-3">Resets Monday 00:00 UTC · ranked by weekly XP</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wide text-ink-3">
                <th className="py-2 pr-2">Rank</th>
                <th className="py-2 pr-2">Name</th>
                <th className="py-2 pr-2">Weekly XP</th>
                <th className="py-2 pr-2">Streak</th>
                <th className="py-2">Total XP</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((row, i) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-border",
                    row.id === userId && "bg-accent-tint",
                  )}
                >
                  <td className="py-2 pr-2 font-mono text-ink-2">{i + 1}</td>
                  <td className="py-2 pr-2 font-medium text-ink">{row.name}</td>
                  <td className="py-2 pr-2 font-mono text-accent">{row.weeklyXP}</td>
                  <td className="py-2 pr-2 font-mono text-warn">{row.drillStreak}</td>
                  <td className="py-2 font-mono text-ink-2">{row.xp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
