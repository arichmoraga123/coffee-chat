import { NextResponse } from "next/server";
import { z } from "zod";
import { getUserIdFromSession } from "@/lib/auth";
import { gradeMcqAnswer } from "@/lib/mcq/server";
import { lockedQuestionIds } from "@/lib/challenges";

const Body = z.object({
  questionId: z.string().min(1).max(100),
  chosenText: z.string().min(1).max(2000),
  msToAnswer: z.number().nonnegative().optional(),
  context: z.enum(["drill", "practice"]).default("practice"),
});

/** Grades one MCQ answer on the server. The correct answer is only revealed after this call. */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const { questionId, chosenText, msToAnswer, context } = parsed.data;
  if (context === "practice" && (await lockedQuestionIds(userId)).includes(questionId)) {
    return NextResponse.json({ error: "Finish your challenge first." }, { status: 423 });
  }
  const result = await gradeMcqAnswer(userId, questionId, chosenText, msToAnswer ?? 0, context);
  if (!result) return NextResponse.json({ error: "Question not found" }, { status: 404 });
  return NextResponse.json(result);
}
