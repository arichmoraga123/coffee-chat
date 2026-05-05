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

/** Stored on Opportunity.role; labels match form copy. */
export const OPPORTUNITY_ROLE_VALUES = [
  "Summer Analyst",
  "Full-Time Analyst",
  "Other",
] as const;

export function opportunityRoleBadge(role: string): string {
  if (role === "Summer Analyst") return "SA";
  if (role === "Full-Time Analyst") return "FT";
  if (role === "Other") return "Other";
  return role.length <= 8 ? role : `${role.slice(0, 7)}…`;
}
