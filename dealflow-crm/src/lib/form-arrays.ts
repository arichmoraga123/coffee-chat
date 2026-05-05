/** Parse JSON body fields into string arrays (newline/comma split or array). */
export function normalizeStringArray(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v === "string") {
    return v
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function normalizeIntArray(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => Number(x))
    .filter((n) => Number.isInteger(n) && n >= 0);
}
