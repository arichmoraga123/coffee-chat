import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { getLesson, nextLesson } from "@/lib/learn/lessons";
import type { BlockOf } from "@/lib/learn/schema";
import type { BlockStateMap } from "@/lib/learn/progress-server";
import { isMentorRole, latestResources } from "@/lib/learn/resources-server";
import { LessonPlayer } from "@/components/learn/lesson-player";
import { MCQ_WHERE } from "@/lib/mcq/server";
import { LessonHelp } from "@/components/learn/lesson-help";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ lessonId: string }> }): Promise<Metadata> {
  const { lessonId } = await params;
  const lesson = getLesson(lessonId);
  return { title: lesson ? `${lesson.title} · Prospect Learn` : "Prospect Learn" };
}

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const userId = await requireUserId();
  const { lessonId } = await params;
  const lesson = getLesson(lessonId);
  if (!lesson) notFound();

  const workbookKeys = Array.from(
    new Set([lesson.workbook, ...lesson.blocks.map((b) => (b.type === "excelLink" ? b.workbook : undefined))].filter(Boolean) as string[]),
  );

  const [progress, user, resources, faqRows, myQuestions, practiceCount] = await Promise.all([
    prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } }),
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    latestResources(workbookKeys),
    prisma.mentorQuestion.findMany({
      where: { lessonId, status: "answered", public: true },
      orderBy: { answeredAt: "asc" },
      select: { id: true, question: true, answer: true },
    }),
    prisma.mentorQuestion.findMany({
      where: { lessonId, userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, question: true, answer: true, status: true, blockId: true, createdAt: true },
    }),
    prisma.question.count({ where: { ...MCQ_WHERE, lessonId } }),
  ]);

  // Mark this user's newly answered questions as seen.
  if (myQuestions.some((q) => q.status === "answered")) {
    await prisma.mentorQuestion.updateMany({ where: { lessonId, userId, status: "answered", seenByUser: false }, data: { seenByUser: true } });
  }

  const faqs: BlockOf<"deepDive">[] = faqRows.map((q) => ({
    type: "deepDive",
    id: `faq-${q.id}`,
    title: q.question.length > 140 ? `${q.question.slice(0, 137)}…` : q.question,
    difficulty: "follow-up",
    teaser: "Answered by a PE@Broad mentor",
    body: `${q.question.length > 140 ? `**Question:** ${q.question}\n\n` : ""}${q.answer ?? ""}`,
  }));

  const next = nextLesson(lesson.id);

  return (
    <LessonPlayer
      lesson={lesson}
      initialState={(progress?.blockState ?? {}) as BlockStateMap}
      initialStatus={(progress?.status as "in_progress" | "completed" | undefined) ?? null}
      initialScore={progress?.score ?? 0}
      seed={userId}
      isAdmin={isMentorRole(user?.role)}
      resources={resources}
      faqs={faqs}
      next={next ? { id: next.id, title: next.title } : null}
      practiceCount={practiceCount}
      footer={
        <LessonHelp
          key="lesson-help"
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          blocks={lesson.blocks.map((b) => ({ id: b.id, label: b.type === "deepDive" ? b.title : b.type }))}
          myQuestions={myQuestions.map((q) => ({ ...q, createdAt: q.createdAt.toISOString() }))}
        />
      }
    />
  );
}
