/** Matching rules shared by duplicate checks and the importer (Phase I.2). */

const FIRM_NOISE = /\b(llc|l\.l\.c|inc|incorporated|lp|l\.p|llp|group|partners|partner|co|company|corp|corporation|ltd|holdings|the|and)\b/g;

/** "Halvorsen & Pike, LLC" and "Halvorsen and Pike" both → "halvorsen pike". */
export function normalizeFirmName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(FIRM_NOISE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lowercase, no protocol/www, no query, no trailing slash. */
export function normalizeLinkedIn(url: string): string {
  const u = url.trim().toLowerCase();
  if (!u) return "";
  return u.replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[?#]/)[0].replace(/\/+$/, "");
}

/** Trigram similarity (same idea as Postgres pg_trgm) for "did you mean this firm?" suggestions. */
export function trigramSimilarity(a: string, b: string): number {
  const grams = (s: string) => {
    const t = `  ${s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
    const out = new Set<string>();
    for (let i = 0; i < t.length - 2; i++) out.add(t.slice(i, i + 3));
    return out;
  };
  const A = grams(a);
  const B = grams(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return inter / (A.size + B.size - inter);
}
