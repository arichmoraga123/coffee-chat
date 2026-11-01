/** Storybank: the six stories every finance candidate should have ready, and the questions they answer. Client-safe. */

export type StorySlot = { id: string; title: string; prompt: string; jogs: string[] };

export const STORY_SLOTS: StorySlot[] = [
  {
    id: "leadership",
    title: "Leadership",
    prompt: "A time you led people toward a goal, formally or not.",
    jogs: ["A club, team, job, or project where others followed your lead", "What was at stake, and what did you decide?", "How did the group or result change because of you?"],
  },
  {
    id: "teamwork",
    title: "Teamwork",
    prompt: "A time you were a key part of a team that delivered something hard.",
    jogs: ["Group project, case competition, sports team, internship team", "What was your specific role?", "What did you do when the team got stuck?"],
  },
  {
    id: "failure",
    title: "Setback or failure",
    prompt: "A time something went wrong (ideally your fault) and what you did next.",
    jogs: ["A missed deadline, bad grade, rejected application, project that flopped", "What did you own?", "What do you do differently now?"],
  },
  {
    id: "conflict",
    title: "Conflict or a difficult person",
    prompt: "A time you disagreed with someone or worked with someone difficult.",
    jogs: ["A teammate not pulling weight, a disagreement on direction, a tough manager", "How did you handle the conversation?", "How did it end, and how is the relationship now?"],
  },
  {
    id: "initiative",
    title: "Initiative",
    prompt: "A time you went beyond what was asked or started something on your own.",
    jogs: ["Started a club or project, fixed a process nobody asked you to, taught yourself a skill", "Why did you start it?", "What came of it (numbers if possible)?"],
  },
  {
    id: "analytical",
    title: "Analytical problem",
    prompt: "A time you used data or careful analysis to solve a problem or make a call.",
    jogs: ["Stock pitch, a model you built, a research project, a business decision at a job", "What did the numbers show?", "What did you recommend and what happened?"],
  },
];

/** Common behavioral questions in IB / PE interviews. The AI maps each story onto these. */
export const BEHAVIORAL_QUESTIONS = [
  "Tell me about a time you led a team.",
  "Tell me about a time you worked on a team to accomplish a goal.",
  "Tell me about a time you failed.",
  "Tell me about a mistake you made and how you handled it.",
  "Tell me about a time you had a conflict with a teammate.",
  "Tell me about a time you worked with a difficult person.",
  "Tell me about a time you disagreed with your manager or a leader.",
  "Tell me about a time you took initiative.",
  "Tell me about a time you went above and beyond.",
  "Tell me about a time you used data to make a decision.",
  "Tell me about a complex problem you solved.",
  "Tell me about a time you had to learn something quickly.",
  "Tell me about a time you managed multiple deadlines at once.",
  "Tell me about a time you worked under pressure.",
  "Tell me about a time you persuaded someone to change their mind.",
  "Tell me about a time you received critical feedback.",
  "Tell me about your greatest accomplishment.",
  "Tell me about a time you showed attention to detail.",
  "What is your greatest weakness?",
  "What is your greatest strength?",
  "Why should we hire you?",
  "Tell me about a time you dealt with ambiguity.",
] as const;
export type BehavioralQuestion = (typeof BEHAVIORAL_QUESTIONS)[number];

export type PolishedStory = {
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  oneLiner: string;
  twoMinute: string;
};
export type StoryQuestion = { question: BehavioralQuestion; angle: string };
export type StoryRecord = {
  id: string;
  slot: string;
  title: string;
  rawText: string;
  polished: PolishedStory | null;
  questions: StoryQuestion[];
  feedback: string | null;
  followUps?: string[];
  updatedAt: string;
};
