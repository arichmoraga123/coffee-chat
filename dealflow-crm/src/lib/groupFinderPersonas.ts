import type { FinderAnswers } from "@/lib/groupFinder";

/** Persona checks for the Group Finder (F3.3). Shared by the unit test and the admin "Run persona tests" button. */
export const GROUP_FINDER_PERSONAS: { name: string; expect: string; answers: FinderAnswers }[] = [
  { name: "Bio major", expect: "healthcare", answers: { q1: 1, q2: 2, q3: 0, q4: 1, q5: 1, q6: 2, q7: 0, q8: 0, q9: 3, q10: 4, q11: 1, q12: 4, q13: 4, q14: 1 } },
  { name: "Distressed-debt enthusiast", expect: "rx", answers: { q1: 7, q2: 0, q3: 3, q4: 1, q5: 2, q6: 0, q7: 3, q8: 1, q9: 2, q10: 0, q11: 0, q12: 2, q13: 2, q14: 2 } },
  { name: "Live-markets person", expect: "ecm", answers: { q1: 8, q2: 1, q3: 2, q4: 0, q5: 2, q6: 2, q7: 5, q8: 2, q9: 1, q10: 0, q11: 0, q12: 1, q13: 3, q14: 2 } },
  { name: "PE-curious generalist", expect: "fsg", answers: { q1: 9, q2: 0, q3: 1, q4: 2, q5: 2, q6: 1, q7: 5, q8: 3, q9: 0, q10: 1, q11: 2, q12: 1, q13: 0, q14: 0 } },
  { name: "Houston energy", expect: "energy", answers: { q1: 5, q2: 2, q3: 5, q4: 2, q5: 0, q6: 2, q7: 2, q8: 0, q9: 3, q10: 2, q11: 0, q12: 4, q13: 0, q14: 1 } },
  { name: "Tech student", expect: "tmt", answers: { q1: 0, q2: 2, q3: 2, q4: 2, q5: 1, q6: 2, q7: 1, q8: 0, q9: 3, q10: 3, q11: 2, q12: 4, q13: 1, q14: 1 } },
];
