import bankV1 from "../../../content/questions/PEB_Question_Bank_v1.json";

/** One question as written in content/questions/PEB_Question_Bank_v1.json. */
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

export const PEB_BANK_V1 = bankV1 as BankQuestion[];
