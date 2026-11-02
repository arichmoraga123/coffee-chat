import bankV2 from "../../../content/questions/PEB_Question_Bank_v2.json";

/** One question as written in content/questions/PEB_Question_Bank_v2.json (v2 keeps every v1 id unchanged). */
export type BankQuestion = {
  id: string;
  lessonId: string;
  module: number;
  category: string;
  difficulty: string;
  question: string;
  options: string[];
  correctIndex: number;
  answer: string;
  explanation: string;
  keywords: string[];
  source: string;
  mcqEligible: boolean;
};

/** The current PE@Broad bank: 505 questions. peb-0001–peb-0236 are the v1 questions, unchanged. */
export const PEB_BANK = bankV2 as BankQuestion[];
/** Kept for older imports. */
export const PEB_BANK_V1 = PEB_BANK;
