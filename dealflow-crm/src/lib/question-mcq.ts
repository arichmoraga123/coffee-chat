export type McqDistractorSource = { id: string; answer: string; category: string };

export type McqOption = { key: string; text: string; isCorrect: boolean };

export function truncateAnswer(s: string, max = 80): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * One correct + three wrong answers (prefer same category), shuffled.
 */
export function buildMcqOptions(
  current: McqDistractorSource,
  pool: McqDistractorSource[],
): McqOption[] {
  const correctText = truncateAnswer(current.answer);
  const wrongPool = pool.filter((q) => q.id !== current.id);
  const picked: string[] = [];
  const tryAdd = (text: string) => {
    const t = truncateAnswer(text);
    if (!t || t === correctText || picked.includes(t)) return false;
    picked.push(t);
    return true;
  };

  const sameCat = shuffle(wrongPool.filter((q) => q.category === current.category));
  for (const q of sameCat) {
    if (picked.length >= 3) break;
    tryAdd(q.answer);
  }

  const other = shuffle(wrongPool.filter((q) => q.category !== current.category));
  for (const q of other) {
    if (picked.length >= 3) break;
    tryAdd(q.answer);
  }

  for (const q of shuffle(wrongPool)) {
    if (picked.length >= 3) break;
    tryAdd(q.answer);
  }

  while (picked.length < 3) {
    picked.push(`(Alternative perspective ${picked.length + 1})`);
  }

  const opts: McqOption[] = [
    { key: "c", text: correctText, isCorrect: true },
    ...picked.slice(0, 3).map((text, i) => ({ key: `w${i}`, text, isCorrect: false })),
  ];
  return shuffle(opts);
}
