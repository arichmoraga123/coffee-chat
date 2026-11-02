import { NextResponse } from "next/server";
import { getUserIdFromSession } from "@/lib/auth";
import { listMcqs, practiceModeQuestions, type PracticeMode } from "@/lib/mcq/server";
import { lockedQuestionIds } from "@/lib/challenges";
import { MCQ_DIFFICULTIES, toLessonId } from "@/lib/mcq/validate";

/** A shuffled practice set. Options come back shuffled and without the correct answer. */
export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const moduleRaw = sp.get("module");
  const mod = moduleRaw !== null && /^\d+$/.test(moduleRaw) ? Number(moduleRaw) : undefined;
  const lesson = sp.get("lesson");
  const difficulty = sp.get("difficulty");
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 10, 1), 50);
  const exclude = [...(sp.get("exclude") ?? "").split(",").filter(Boolean).slice(0, 500), ...(await lockedQuestionIds(userId))];
  const mode = sp.get("mode");
  if (mode === "weak" || mode === "missed" || mode === "hard") {
    return NextResponse.json(await practiceModeQuestions(userId, mode as PracticeMode, { module: mod, limit, exclude }));
  }
  const questions = await listMcqs(
    {
      module: mod,
      lessonId: lesson ? (toLessonId(lesson) ?? undefined) : undefined,
      difficulty: difficulty && (MCQ_DIFFICULTIES as readonly string[]).includes(difficulty) ? difficulty : undefined,
    },
    limit,
    exclude,
  );
  return NextResponse.json({ questions });
}
