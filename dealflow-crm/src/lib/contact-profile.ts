import type { Contact, Firm, Interaction } from "@prisma/client";

const WARMTH = new Set(["COLD", "WARM", "HOT", "ADVOCATE"]);

export function normalizeWarmthScore(v: unknown): string | undefined {
  if (v == null || v === "") return undefined;
  const s = String(v).toUpperCase();
  return WARMTH.has(s) ? s : undefined;
}

export type ContactWithFirm = Contact & { firm: Firm };

export function contactProfileBlock(c: ContactWithFirm): string {
  const lines: string[] = [
    `Name: ${c.fullName}`,
    `Firm: ${c.firm.name}`,
    `Title: ${c.title}`,
    `Group: ${c.group}`,
    `Email: ${c.email}`,
    `Location: ${c.location}`,
    `School (general): ${c.school}`,
  ];
  if (c.linkedinUrl) lines.push(`LinkedIn: ${c.linkedinUrl}`);
  if (c.undergradSchool) lines.push(`Undergrad: ${c.undergradSchool}`);
  if (c.gradSchool) lines.push(`Grad school: ${c.gradSchool}`);
  if (c.graduationYear != null) lines.push(`Graduation year: ${c.graduationYear}`);
  if (c.hometown) lines.push(`Hometown: ${c.hometown}`);
  if (c.previousFirms.length) lines.push(`Previous firms: ${c.previousFirms.join(", ")}`);
  if (c.careerPath) lines.push(`Career path: ${c.careerPath}`);
  if (c.clubs.length) lines.push(`Clubs: ${c.clubs.join(", ")}`);
  if (c.sports.length) lines.push(`Sports: ${c.sports.join(", ")}`);
  if (c.greekLife) lines.push(`Greek life: ${c.greekLife}`);
  if (c.howWeMet) lines.push(`How we met: ${c.howWeMet}`);
  if (c.referredBy) lines.push(`Referred by: ${c.referredBy}`);
  if (c.mutualConnections.length) lines.push(`Mutual connections: ${c.mutualConnections.join(", ")}`);
  lines.push(`Warmth score: ${c.warmthScore}`);
  if (c.hiringTimeline) lines.push(`Hiring timeline: ${c.hiringTimeline}`);
  if (c.whatTheyLookFor) lines.push(`What they look for: ${c.whatTheyLookFor}`);
  if (c.referralPotential) lines.push(`Referral potential (intel): ${c.referralPotential}`);
  if (c.openRoles) lines.push(`Open roles: ${c.openRoles}`);
  if (c.notableDeals.length) lines.push(`Notable deals: ${c.notableDeals.join(", ")}`);
  if (c.notes) lines.push(`General notes: ${c.notes}`);
  return lines.join("\n");
}

export function interactionBlock(i: Interaction): string {
  const parts: string[] = [
    `Date: ${i.date.toISOString().slice(0, 10)}`,
    `Type: ${i.type}`,
  ];
  if (i.notes) parts.push(`Discussed: ${i.notes}`);
  if (i.adviceGiven) parts.push(`Advice given: ${i.adviceGiven}`);
  if (i.actionItems.length) parts.push(`Action items: ${i.actionItems.join(" | ")}`);
  if (i.personalDetails) parts.push(`Personal details: ${i.personalDetails}`);
  if (i.firmInsights) parts.push(`Firm insights: ${i.firmInsights}`);
  if (i.redFlags) parts.push(`Red flags: ${i.redFlags}`);
  return parts.join("\n");
}
