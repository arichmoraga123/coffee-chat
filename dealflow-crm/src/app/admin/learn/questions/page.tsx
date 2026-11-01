import { prisma } from "@/lib/prisma";
import { requireMentorUserId } from "@/lib/auth";
import { getLesson } from "@/lib/learn/lessons";
import { MentorQueue, type QueueItem } from "@/components/learn/admin/mentor-queue";

export const dynamic = "force-dynamic";

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000);
}

export default async function MentorQuestionsPage() {
  await requireMentorUserId();
  const rows = await prisma.mentorQuestion.findMany({
    where: { OR: [{ status: "open" }, { answeredAt: { gte: daysAgo(30) } }] },
    orderBy: { createdAt: "asc" },
    take: 300,
    include: { user: { select: { name: true, email: true } } },
  });

  const items: QueueItem[] = rows.map((q) => {
    const lesson = getLesson(q.lessonId);
    const block = q.blockId ? lesson?.blocks.find((b) => b.id === q.blockId) : null;
    return {
      id: q.id,
      lessonId: q.lessonId,
      lessonTitle: lesson?.title ?? q.lessonId,
      blockLabel: block ? `${block.id} · ${block.type === "deepDive" ? block.title : block.type}` : null,
      question: q.question,
      answer: q.answer,
      status: q.status,
      public: q.public,
      asker: q.user.name,
      createdAt: q.createdAt.toISOString(),
      answeredBy: q.answeredBy,
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Learn · Mentor queue</h1>
        <p className="mt-1 text-sm text-ink-2">
          Questions students sent from lessons. Answer them here — the student sees the answer on the lesson page. Tick
          &ldquo;Add to lesson as FAQ&rdquo; to show it to everyone as a deep dive, so the questions people keep asking become
          part of the lesson.
        </p>
      </div>
      <MentorQueue items={items} />
    </div>
  );
}
