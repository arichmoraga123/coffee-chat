export const QUESTION_MODE_STORAGE_KEY = "dealflow-question-mode";

export type QuestionPracticeMode = "flashcard" | "mcq";

export function readStoredQuestionMode(): QuestionPracticeMode {
  if (typeof window === "undefined") return "mcq";
  try {
    const v = localStorage.getItem(QUESTION_MODE_STORAGE_KEY);
    return v === "flashcard" ? "flashcard" : "mcq";
  } catch {
    return "mcq";
  }
}

export function writeStoredQuestionMode(mode: QuestionPracticeMode) {
  try {
    localStorage.setItem(QUESTION_MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}
