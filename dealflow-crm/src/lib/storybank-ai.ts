import "server-only";
import { anthropicJson } from "@/lib/anthropic";
import { senderBlock } from "@/lib/email-ai";
import { BEHAVIORAL_QUESTIONS, STORY_SLOTS, type PolishedStory, type StoryQuestion } from "@/lib/storybank";

const STORY_COACH = `You are an interview coach for undergraduates recruiting for investment banking and private equity. Students give you a messy brain dump of an experience; you turn it into a crisp interview story.

Rules:
- Keep it TRUE: use only facts from the brain dump. Don't invent numbers, titles, outcomes, or people. If a number would help but isn't given, keep the sentence honest and ask for it in "feedback".
- STAR, but the Action section carries the weight: what the student personally did ("I"), the choices they made and why. Keep Situation and Task short.
- Results should be concrete (numbers, outcomes, what changed) plus one line on what they learned.
- "oneLiner": a single sentence they can glance at before an interview to remember the story.
- "twoMinute": how they'd say it out loud: first person, natural, about 220–280 words, no headings, no bullet points, no buzzwords ("synergy", "passionate", "leverage").
- "questions": pick 3–7 questions from the provided list that this story genuinely answers, strongest fit first, each with a one-sentence "angle" telling them what to emphasize for that question. Only use exact question text from the list.
- "feedback": 2–4 short, specific coaching notes: what's missing or weak (e.g., "Quantify the result: how many members joined?", "Your role is unclear in paragraph 2"), and whether this is a good fit for its slot.
- "followUps": 3 follow-up questions an interviewer would likely ask about this story.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "situation", "task", "action", "result", "oneLiner", "twoMinute", "questions", "feedback", "followUps"],
  properties: {
    title: { type: "string", description: "Short name for the story, 3–7 words" },
    situation: { type: "string" },
    task: { type: "string" },
    action: { type: "string" },
    result: { type: "string" },
    oneLiner: { type: "string" },
    twoMinute: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "angle"],
        properties: { question: { type: "string", enum: [...BEHAVIORAL_QUESTIONS] }, angle: { type: "string" } },
      },
    },
    feedback: { type: "array", items: { type: "string" } },
    followUps: { type: "array", items: { type: "string" } },
  },
} as const;

export type PolishResult = PolishedStory & { questions: StoryQuestion[]; feedback: string[]; followUps: string[] };

export async function polishStory(userId: string, slotId: string, raw: string, otherStories: string[]): Promise<PolishResult> {
  const slot = STORY_SLOTS.find((s) => s.id === slotId);
  const sender = await senderBlock(userId);
  const prompt = [
    slot ? `This is the student's "${slot.title}" story (${slot.prompt})` : "This is an extra story the student added.",
    "",
    "STUDENT:",
    sender.text,
    "",
    otherStories.length ? `THEIR OTHER STORIES (avoid mapping questions those already cover better, and avoid repeating them):\n${otherStories.map((s) => `- ${s}`).join("\n")}\n` : "",
    "QUESTION LIST (use exact text):",
    BEHAVIORAL_QUESTIONS.map((q) => `- ${q}`).join("\n"),
    "",
    "BRAIN DUMP:",
    raw,
  ].join("\n");
  return anthropicJson<PolishResult>(prompt, SCHEMA as unknown as Record<string, unknown>, {
    system: STORY_COACH,
    cacheSystem: true,
    maxTokens: 3000,
    effort: "medium",
    usageLog: { userId, feature: "storybank" },
  });
}
