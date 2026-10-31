import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { getLesson } from "@/lib/learn/lessons";
import { MCQ_WHERE } from "@/lib/mcq/server";
import { toLessonId } from "@/lib/mcq/validate";
import { PracticeClient, type PracticeLessonOption } from "@/components/practice/practice-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Practice" };

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string; module?: string; difficulty?: string }>;
}) {
  const sp = await searchParams;
  const userId = await requireUserId();

  const [counts, attempts] = await Promise.all([
    prisma.question.groupBy({ by: ["lessonId"], where: MCQ_WHERE, _count: { _all: true } }),
    prisma.questionAttempt.findMany({
      where: { userId, question: { mcqEligible: true } },
      select: { correct: true, question: { select: { lessonId: true } } },
    }),
  ]);

  const stats = new Map<string, { right: number; total: number }>();
  for (const a of attempts) {
    const l = a.question.lessonId ?? "?";
    const s = stats.get(l) ?? { right: 0, total: 0 };
    s.total++;
    if (a.correct) s.right++;
    stats.set(l, s);
  }

  const lessons: PracticeLessonOption[] = counts
    .filter((c) => c.lessonId)
    .map((c) => {
      const id = c.lessonId as string;
      const lesson = getLesson(id);
      const s = stats.get(id);
      return {
        id,
        module: Number(id.split("-")[0]),
        moduleTitle: lesson?.moduleTitle ?? `Module ${id.split("-")[0]}`,
        title: lesson?.title ?? `Lesson ${id.replace("-", ".")}`,
        count: c._count._all,
        attempted: s?.total ?? 0,
        accuracy: s && s.total ? Math.round((s.right / s.total) * 100) : null,
      };
    })
    .sort((a, b) => a.module - b.module || Number(a.id.split("-")[1]) - Number(b.id.split("-")[1]));

  const initialLesson = sp.lesson ? toLessonId(sp.lesson) : null;
  const initialModule = sp.module && /^\d+$/.test(sp.module) ? Number(sp.module) : null;
  const initialDifficulty = ["Easy", "Medium", "Hard"].includes(sp.difficulty ?? "") ? (sp.difficulty as string) : null;

  return (
    <PracticeClient
      lessons={lessons}
      initialLesson={initialLesson && lessons.some((l) => l.id === initialLesson) ? initialLesson : null}
      initialModule={initialModule}
      initialDifficulty={initialDifficulty}
    />
  );
}
