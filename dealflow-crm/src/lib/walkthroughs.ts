/** Guided-mode step data (content/walkthroughs/*.walkthrough.json). Client-safe types. */
export type WalkStep = {
  id: string;
  kind: "formula" | "formula-text" | "value" | "choice" | "text";
  sheet: string;
  cell: string;
  label: string | null;
  header: string | null;
  instruction: string;
  hint: string | null;
  expectedFormula?: string;
  expectedValue: number | string | null;
  tolerance?: number | null;
  options?: string[] | null;
  references?: { sheet: string; ref: string; label: string; value: number | string | null }[];
  numberFormat?: string;
  functions?: string[];
};
export type Walkthrough = { workbookKey: string; studentFile: string; answerKeyFile: string; sheets: string[]; stepCount: number; steps: WalkStep[] };

/** Is a computed value right for this step? */
export function matches(step: WalkStep, v: unknown): boolean {
  if (typeof step.expectedValue === "number") {
    if (typeof v !== "number" || !Number.isFinite(v)) return false;
    const tol = step.tolerance ?? Math.max(1e-6, Math.abs(step.expectedValue) * 0.005);
    return Math.abs(v - step.expectedValue) <= tol + 1e-9;
  }
  if (step.expectedValue === null) return v === null || v === "";
  return String(v ?? "").trim().toLowerCase() === String(step.expectedValue).trim().toLowerCase();
}
