/** Canonical deal types for dropdowns, APIs, and AI validation. */
export const DEAL_TYPE_OPTIONS = [
  "M&A",
  "LBO",
  "Take-Private",
  "Secondary Buyout",
  "Carve-Out",
  "Merger of Equals",
  "Recap",
  "Dividend Recap",
  "IPO",
  "SPAC",
  "Growth Equity",
  "Venture Round",
  "Series A",
  "Series B",
  "Series C",
  "Late Stage VC",
  "Down Round",
  "Real Estate Acquisition",
  "Real Estate Development",
  "REIT Transaction",
  "Sale-Leaseback",
  "Real Estate Recap",
  "Direct Lending",
  "Unitranche",
  "Mezzanine",
  "CLO",
  "High Yield Bond Issuance",
  "Leveraged Loan",
  "Distressed Debt",
  "Debt Refinancing",
  "Restructuring",
  "Bankruptcy",
  "Distressed M&A",
  "Block Trade",
  "Follow-On Offering",
  "Convertible Note",
  "Hedge Fund Launch",
  "Fund Raise",
] as const;

export type DealTypeOption = (typeof DEAL_TYPE_OPTIONS)[number];

export const DEAL_TYPE_SET = new Set<string>(DEAL_TYPE_OPTIONS);

/** Vertical for recruiting lens — optional on Deal. */
export const VERTICAL_OPTIONS = [
  "Investment Banking",
  "Private Equity",
  "Venture Capital",
  "Real Estate PE",
  "Hedge Fund",
  "Sales & Trading",
  "Private Credit",
  "Growth Equity",
  "Restructuring",
] as const;

export type VerticalOption = (typeof VERTICAL_OPTIONS)[number];

export const VERTICAL_SET = new Set<string>(VERTICAL_OPTIONS);

export function normalizeDealType(raw: string | undefined | null, fallback: DealTypeOption = "M&A"): DealTypeOption {
  const s = String(raw ?? "").trim();
  if (DEAL_TYPE_SET.has(s)) return s as DealTypeOption;
  return fallback;
}

export function normalizeVertical(raw: string | undefined | null): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  return VERTICAL_SET.has(s) ? s : null;
}
