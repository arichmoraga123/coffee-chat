export const PIPELINE_STAGES = [
  "TARGET",
  "NETWORKING",
  "APPLIED",
  "FIRST_ROUND",
  "TECHNICAL",
  "SUPERDAY",
  "OFFER",
  "REJECTED",
] as const;

export const STAGE_LABELS: Record<(typeof PIPELINE_STAGES)[number], string> = {
  TARGET: "Target",
  NETWORKING: "Networking",
  APPLIED: "Applied",
  FIRST_ROUND: "First Round",
  TECHNICAL: "Technical",
  SUPERDAY: "Superday",
  OFFER: "Offer",
  REJECTED: "Rejected",
};
