/** Workbook ↔ lesson map for the v2 workbook set (Phase M.1). A lesson can list more than one; the first is primary. */
export const WORKBOOK_LESSONS: Record<string, string[]> = {
  PEB_00_TVM_IRR_MOIC: ["0-1", "0-2", "0-3", "11-1"],
  PEB_01_Accounting_3Statement_Linking: ["1-1", "1-2", "1-3"],
  PEB_08_Working_Capital: ["1-4"],
  PEB_09_Deferred_Taxes_NOLs: ["1-5"],
  PEB_06_Merger_Model: ["1-6", "7-2", "7-3", "7-4"],
  PEB_02_EV_Equity_Bridge: ["2-1", "2-2", "2-3", "2-4", "2-5"],
  PEB_10_Sum_of_the_Parts: ["3-1"],
  PEB_05_Comps_Precedents_FootballField: ["3-2", "3-3", "4-1", "4-2", "4-3", "4-4"],
  PEB_03_CAPM_Beta_WACC: ["5-1", "5-2", "5-3", "5-4", "5-5"],
  PEB_04_DCF: ["6-1", "6-2", "6-3", "6-4", "6-5", "6-7"],
  PEB_07_LBO: ["8-1", "8-2", "8-4", "8-5", "8-7"],
  PEB_11_Credit_Analysis_Recovery: ["8-3", "9-1", "9-2", "9-3"],
  PEB_12_Bank_Valuation: ["6-6", "10-1"],
  PEB_13_REIT_Valuation: ["10-2"],
  PEB_14_SaaS_Metrics: ["10-4"],
};

export const ALL_WORKBOOK_KEYS = Object.keys(WORKBOOK_LESSONS).sort();

export function workbooksForLesson(lessonId: string): string[] {
  return Object.entries(WORKBOOK_LESSONS)
    .filter(([, ids]) => ids.includes(lessonId))
    .map(([k]) => k);
}

/** "PEB_04_DCF" → "DCF"; "PEB_01_Accounting_3Statement_Linking" → "Accounting 3-Statement Linking". */
export function workbookTitle(key: string) {
  return key
    .replace(/^PEB_\d{2}_/, "")
    .replace(/_/g, " ")
    .replace(/\b3Statement\b/, "3-Statement")
    .replace(/\bTVM IRR MOIC\b/, "TVM, IRR & MOIC")
    .replace(/\bEV Equity Bridge\b/, "EV to Equity Bridge")
    .replace(/\bNOLs\b/, "NOLs")
    .replace(/\bComps Precedents FootballField\b/, "Comps, Precedents & Football Field")
    .replace(/\bCAPM Beta WACC\b/, "CAPM, Beta & WACC")
    .replace(/\bSum of the Parts\b/, "Sum of the Parts");
}
