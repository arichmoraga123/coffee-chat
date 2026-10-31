import type { Deal } from "@prisma/client";

/** Plain-text fact sheet for a deal, used as grounding in AI prompts. */
export function dealFactSheet(d: Deal): string {
  return [
    `Deal: ${d.title}`,
    `Announced: ${d.announcedAt.toISOString().slice(0, 10)}`,
    `Type: ${d.dealType}`,
    d.acquirer ? `Buyer: ${d.acquirer}` : null,
    d.target ? `Target: ${d.target}` : null,
    d.dealValue ? `Value: ${d.dealValue}` : null,
    d.sector ? `Sector: ${d.sector}` : null,
    `Summary: ${d.summary}`,
    d.keyThesis ? `Rationale: ${d.keyThesis}` : null,
    d.risks ? `Risks: ${d.risks}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export const DEAL_GROUNDING_RULES =
  "Use ONLY the facts in the deal fact sheet for deal terms (price, premium, value, dates, financing). You may add widely known background about the companies, but never invent numbers. Where a number the candidate should know is missing (e.g. EV/EBITDA multiple), tell them to look it up and write [look up: …].";
