export const QUESTION_MODE_STORAGE_KEY = "dealflow-question-mode";

export type QuestionPracticeMode = "flashcard" | "mcq";

export function readStoredQuestionMode(): QuestionPracticeMode {
  if (typeof window === "undefined") return "flashcard";
  try {
    const v = localStorage.getItem(QUESTION_MODE_STORAGE_KEY);
    return v === "mcq" ? "mcq" : "flashcard";
  } catch {
    return "flashcard";
  }
}

export function writeStoredQuestionMode(mode: QuestionPracticeMode) {
  try {
    localStorage.setItem(QUESTION_MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}
