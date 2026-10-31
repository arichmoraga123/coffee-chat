"use server";

import { getUserIdFromSession } from "@/lib/auth";
import { applyLessonEvent, type EventResult, type LessonEvent } from "@/lib/learn/progress-server";

/** Records one lesson interaction (answer, reveal, deep dive opened, step, checkpoint self-grade). */
export async function recordLessonEvent(lessonId: string, blockId: string, event: LessonEvent): Promise<EventResult> {
  const userId = await getUserIdFromSession();
  if (!userId) {
    return { ok: false, error: "Please sign in again.", xpGained: 0, lessonStatus: "in_progress", justCompleted: false, score: 0 };
  }
  return applyLessonEvent(userId, lessonId, blockId, event);
}
