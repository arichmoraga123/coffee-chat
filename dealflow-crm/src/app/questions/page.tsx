import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { QuestionsBank } from "@/components/questions-bank";
import { QuestionSubmitDialog } from "@/components/question-submit-dialog";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
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
      />

      <Card className="border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Weekly leaderboard</h2>
        <p className="mb-3 text-xs text-zinc-500">Resets Monday 00:00 UTC · ranked by weekly XP</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wide text-zinc-500">
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
                    "border-b border-zinc-800/80",
                    row.id === userId && "bg-[#4a6fa5]/10",
                  )}
                >
                  <td className="py-2 pr-2 font-mono text-zinc-400">{i + 1}</td>
                  <td className="py-2 pr-2 font-medium text-zinc-200">{row.name}</td>
                  <td className="py-2 pr-2 font-mono text-[#c9a84c]">{row.weeklyXP}</td>
                  <td className="py-2 pr-2 font-mono text-orange-300">{row.drillStreak}</td>
                  <td className="py-2 font-mono text-zinc-300">{row.xp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
