import "server-only";
import type { Interaction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { anthropicJsonWithProgress, type AnthropicUsageFeature } from "@/lib/anthropic";
import { partialString, partialStringArray } from "@/lib/partial-json";
import { contactProfileBlock, interactionBlock, type ContactWithFirm } from "@/lib/contact-profile";

/**
 * One place that writes every networking email in the app (cold, thank-you, follow-up, bump, re-engage,
 * referral ask, intro request, LinkedIn note). Shared style rules + the sender's real profile make the
 * drafts specific instead of generic.
 */

import { EMAIL_KINDS, type EmailKind } from "./email-ai-kinds";

export { EMAIL_KINDS, type EmailKind };

export const EMAIL_STYLE = `You write networking emails for undergraduate students recruiting for investment banking, private equity, and similar finance roles. Bankers skim on their phone between tasks; the emails that get replies are short, specific, and easy to say yes to.

Hard rules:
- Write as the student, first person, plain and confident. Sound like a sharp 19–21 year old, not a cover letter.
- NEVER use: "I hope this email finds you well", "I hope you're doing well", "I am reaching out", "I am passionate about", "I would love to pick your brain", "esteemed", "humbly", "synergy", "leverage your expertise", "I know you're busy but", exclamation marks in the first line, or emoji.
- Lead with the hook, not with "My name is". The first sentence must make it obvious why THIS person got the email.
- Use only facts that are in the provided context. Never invent shared experiences, deals, mutual friends, or details. If an ideal hook is missing, use the best real one and list what's missing in "missing".
- One ask per email. Make the ask concrete (15-minute call, a time window) and easy to decline.
- Short paragraphs (1–3 sentences). No bullet points in the body. No bracketed placeholders unless the info is truly unknown — then use [brackets] and list it in "missing".
- Sign off with "Best," then the student's full name on the next line and "School 'YY" (e.g. "Michigan State University '28") on the line after.
- Subject lines: specific and short (under 9 words), e.g. "MSU sophomore — question about Jefferies TMT", "Thank you — Jefferies coffee chat". Return 3 different options.
- Match tone to the firm: bulge bracket/elite boutique/PE = crisp and formal-casual; never slangy.`;

const EMAIL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["subjects", "body", "personalization", "missing", "tips"],
  properties: {
    subjects: { type: "array", items: { type: "string" }, description: "3 subject line options, best first" },
    body: { type: "string", description: "The email body including greeting and signature. Plain text." },
    personalization: { type: "array", items: { type: "string" }, description: "Which specific facts from the context the email uses" },
    missing: { type: "array", items: { type: "string" }, description: "Info that would make it stronger, or [placeholders] the student must fill in" },
    tips: { type: "array", items: { type: "string" }, description: "1–3 short sending tips (timing, attach resume, follow-up date)" },
  },
} as const;

export type EmailDraft = { subjects: string[]; body: string; personalization: string[]; missing: string[]; tips: string[] };

export type ManualRecipient = {
  name: string;
  firm?: string;
  title?: string;
  group?: string;
  school?: string;
  hook?: string;
  notes?: string;
};

/** The student's own profile, so drafts can use real details (school, class year, club, targets, stories). */
export async function senderBlock(userId: string): Promise<{ text: string; firstName: string }> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      classYear: true,
      bio: true,
      careerTracks: true,
      recruitingTarget: true,
      targetFirms: true,
      school: { select: { name: true, shortName: true } },
      clubMemberships: { where: { active: true }, select: { role: true, club: { select: { name: true } } } },
      stories: { where: { polished: { not: undefined } }, select: { title: true, polished: true }, take: 3, orderBy: { updatedAt: "desc" } },
    },
  });
  if (!u) return { text: "", firstName: "" };
  const oneLiners = u.stories
    .map((s) => (s.polished as { oneLiner?: string } | null)?.oneLiner)
    .filter(Boolean)
    .slice(0, 2);
  const lines = [
    `Name: ${u.name}`,
    `School: ${u.school?.name ?? "Michigan State University"} (${u.school?.shortName ?? "MSU"})`,
    u.classYear ? `Class year: ${u.classYear} (write it as '${String(u.classYear).slice(2)})` : "Class year: unknown",
    u.clubMemberships.length ? `Clubs: ${u.clubMemberships.map((m) => `${m.club.name}${m.role !== "member" ? ` (${m.role})` : ""}`).join(", ")}` : null,
    u.careerTracks.length ? `Recruiting for: ${u.careerTracks.join(", ")}` : null,
    u.recruitingTarget.length ? `Target groups: ${u.recruitingTarget.join(", ")}` : null,
    u.targetFirms.length ? `Target firms: ${u.targetFirms.join(", ")}` : null,
    u.bio ? `About: ${u.bio}` : null,
    oneLiners.length ? `Notable experiences: ${oneLiners.join(" | ")}` : null,
  ].filter(Boolean);
  return { text: lines.join("\n"), firstName: u.name.split(" ")[0] ?? u.name };
}

/** Recent published deals that mention the recipient's firm — a strong, real hook when available. */
export async function firmDealsBlock(firmName: string | undefined): Promise<string> {
  const name = firmName?.trim();
  if (!name || name.length < 3) return "";
  const deals = await prisma.deal.findMany({
    where: {
      status: "published",
      OR: [
        { acquirer: { contains: name, mode: "insensitive" } },
        { target: { contains: name, mode: "insensitive" } },
        { title: { contains: name, mode: "insensitive" } },
        { summary: { contains: name, mode: "insensitive" } },
      ],
    },
    orderBy: { announcedAt: "desc" },
    take: 3,
    select: { title: true, dealValue: true, announcedAt: true, summary: true },
  });
  if (!deals.length) return "";
  return deals
    .map((d) => `- ${d.title}${d.dealValue ? ` (${d.dealValue})` : ""}, ${d.announcedAt.toISOString().slice(0, 10)}: ${d.summary.slice(0, 220)}`)
    .join("\n");
}

export async function generateEmail(opts: {
  userId: string;
  kind: EmailKind;
  contact?: ContactWithFirm;
  manual?: ManualRecipient;
  interaction?: Interaction | null;
  history?: Interaction[];
  extra?: string;
  templateBody?: string;
  feature: AnthropicUsageFeature;
  /** Called while the model writes, with the subject lines and body so far. */
  onPartial?: (p: { subjects: string[]; body: string }) => void;
}): Promise<EmailDraft> {
  const kind = EMAIL_KINDS[opts.kind];
  const firmName = opts.contact?.firm.name ?? opts.manual?.firm;
  // Both lookups at once instead of one after the other.
  const [sender, deals] = await Promise.all([senderBlock(opts.userId), firmDealsBlock(firmName)]);

  const recipient = opts.contact
    ? contactProfileBlock(opts.contact)
    : [
        `Name: ${opts.manual?.name}`,
        opts.manual?.firm ? `Firm: ${opts.manual.firm}` : null,
        opts.manual?.title ? `Title: ${opts.manual.title}` : null,
        opts.manual?.group ? `Group: ${opts.manual.group}` : null,
        opts.manual?.school ? `School: ${opts.manual.school}` : null,
        opts.manual?.hook ? `Connection / hook: ${opts.manual.hook}` : null,
        opts.manual?.notes ? `Notes: ${opts.manual.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n");

  const prompt = [
    `Write a ${kind.label} email.`,
    `Goal and structure: ${kind.goal}`,
    "",
    "SENDER (the student):",
    sender.text,
    "",
    "RECIPIENT:",
    recipient,
    opts.interaction ? `\nTHE CONVERSATION THIS IS ABOUT:\n${interactionBlock(opts.interaction)}` : "",
    opts.history?.length ? `\nEARLIER INTERACTIONS (newest first):\n${opts.history.map((i) => interactionBlock(i)).join("\n---\n")}` : "",
    deals ? `\nRECENT DEALS INVOLVING THEIR FIRM (you may reference ONE if natural):\n${deals}` : "",
    opts.templateBody ? `\nSTART FROM THIS TEMPLATE'S STRUCTURE (rewrite it to fit; don't copy filler):\n${opts.templateBody}` : "",
    opts.extra ? `\nEXTRA INSTRUCTIONS FROM THE STUDENT:\n${opts.extra}` : "",
    "",
    `Sign off as ${sender.firstName}.`,
  ]
    .filter((x) => x !== "")
    .join("\n");

  // Short writing task: low effort means less thinking before the first word (much faster), same rules.
  return anthropicJsonWithProgress<EmailDraft>(
    prompt,
    EMAIL_SCHEMA as unknown as Record<string, unknown>,
    {
      system: EMAIL_STYLE,
      cacheSystem: true,
      maxTokens: 1500,
      effort: "low",
      usageLog: { userId: opts.userId, feature: opts.feature },
    },
    (soFar) => opts.onPartial?.({ subjects: partialStringArray(soFar, "subjects"), body: partialString(soFar, "body") }),
  );
}

/** Plain-text version for the existing "copy this draft" modals. */
export function draftToText(d: EmailDraft): string {
  const parts = [`Subject: ${d.subjects[0] ?? ""}`, "", d.body.trim()];
  if (d.subjects.length > 1) parts.push("", "———", `Other subject lines: ${d.subjects.slice(1).join("  |  ")}`);
  if (d.personalization.length) parts.push(`Personalized with: ${d.personalization.join("; ")}`);
  if (d.missing.length) parts.push(`Before you send: ${d.missing.join("; ")}`);
  if (d.tips.length) parts.push(`Tips: ${d.tips.join(" ")}`);
  return parts.join("\n");
}
