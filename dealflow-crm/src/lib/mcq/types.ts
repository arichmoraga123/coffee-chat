/** What the browser gets: the question and its 4 options in shuffled order — never which one is correct. */
export type PublicMcq = {
  id: string;
  question: string;
  options: string[];
  lessonId: string | null;
  category: string;
  difficulty: string;
};

export type McqContext = "drill" | "practice" | "challenge";

export type GradeResult = {
  correct: boolean;
  correctText: string;
  explanation: string | null;
  lessonId: string | null;
  xpAwarded: number;
};
