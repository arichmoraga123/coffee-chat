/**
 * Ranking for search-as-you-type lists. Order: exact → starts with → a word starts with →
 * contains → fuzzy (subsequence / small typos). Returns the score and the matched character
 * positions so the UI can bold them.
 */
export type Match = { score: number; positions: number[] };

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

function levenshtein(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

const range = (start: number, len: number) => Array.from({ length: len }, (_, i) => start + i);

export function matchScore(label: string, query: string): Match | null {
  const q = norm(query.trim());
  if (!q) return { score: 1, positions: [] };
  const l = norm(label);
  if (l === q) return { score: 1000, positions: range(0, l.length) };
  if (l.startsWith(q)) return { score: 800 - l.length * 0.01, positions: range(0, q.length) };
  // A word starts with the query ("pike" → "Halvorsen & Pike").
  const wordRe = /[a-z0-9]+/g;
  let m: RegExpExecArray | null;
  while ((m = wordRe.exec(l))) {
    if (l.startsWith(q, m.index)) return { score: 600 - m.index * 0.1, positions: range(m.index, q.length) };
  }
  const idx = l.indexOf(q);
  if (idx >= 0) return { score: 400 - idx * 0.1, positions: range(idx, q.length) };
  // Typo tolerance: compare against each word (and the whole label for short queries).
  if (q.length >= 3) {
    const max = q.length <= 4 ? 1 : 2;
    wordRe.lastIndex = 0;
    while ((m = wordRe.exec(l))) {
      const w = m[0].slice(0, q.length + max);
      const d = levenshtein(q, w.slice(0, Math.max(q.length, Math.min(w.length, q.length))), max);
      if (d <= max) return { score: 200 - d * 20, positions: range(m.index, Math.min(m[0].length, q.length)) };
    }
  }
  // Subsequence ("hlk" → "Houlihan Lokey").
  const pos: number[] = [];
  let j = 0;
  for (let i = 0; i < l.length && j < q.length; i++) if (l[i] === q[j]) pos.push(i), j++;
  if (j === q.length && q.length >= 2) return { score: 100 - (pos[pos.length - 1] - pos[0]) * 0.5, positions: pos };
  return null;
}

export function rank<T>(items: T[], query: string, label: (t: T) => string, extra?: (t: T) => string): (T & { _m?: Match })[] {
  const out: { item: T; m: Match }[] = [];
  for (const it of items) {
    const m = matchScore(label(it), query) ?? (extra ? (() => { const e = matchScore(extra(it), query); return e ? { score: e.score * 0.5, positions: [] } : null; })() : null);
    if (m) out.push({ item: it, m });
  }
  out.sort((a, b) => b.m.score - a.m.score);
  return out.map((o) => Object.assign({}, o.item, { _m: o.m }));
}
