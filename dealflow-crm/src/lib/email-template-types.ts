export const EMAIL_TEMPLATE_TYPES = {
  "cold-outreach": {
    label: "Cold Outreach",
    prompt:
      "Draft a personalized cold outreach email. Reference their school if known as a mutual connection point. Mention their career path. Include the sender's target role and school. Give a specific reason for reaching out. Under 150 words. Professional but warm.",
  },
  "thank-you": {
    label: "Thank You (post coffee chat)",
    prompt:
      "Draft a thank-you email after a coffee chat. Reference specific things discussed. Mention any action items. Under 150 words.",
  },
  "follow-up": {
    label: "Follow Up",
    prompt:
      "Draft a follow-up email referencing the last interaction. Share something relevant or check in on previous discussion. Under 150 words.",
  },
  "re-engage": {
    label: "Re-engage",
    prompt:
      "Draft a re-engagement email after a period of silence. Be brief, reference past connection, and propose a low-pressure catch-up. Under 120 words.",
  },
  bump: {
    label: "Bump (no reply)",
    prompt: "A short bump on an unanswered cold email.",
  },
  "referral-ask": {
    label: "Referral / resume ask",
    prompt: "Ask a contact you've spoken with to pass along your resume or flag your application.",
  },
  linkedin: {
    label: "LinkedIn note (280 chars)",
    prompt: "A LinkedIn connection note.",
  },
  "request-intro": {
    label: "Request Intro",
    prompt:
      "Draft an email requesting an introduction to someone at their firm or network. Be specific about who and why. Under 120 words.",
  },
} as const;

export type EmailTemplateType = keyof typeof EMAIL_TEMPLATE_TYPES;

export function subjectLineForContact(
  templateType: EmailTemplateType,
  firm: string,
  title: string,
  schoolShort = "MSU",
): string {
  if (templateType === "cold-outreach") {
    return `${schoolShort} Student — Quick Question re: ${firm} ${title}`;
  }
  if (templateType === "thank-you") return `Thank you — great conversation`;
  if (templateType === "follow-up") return `Following up`;
  if (templateType === "re-engage") return `Checking in`;
  if (templateType === "bump") return `Re: quick question`;
  if (templateType === "referral-ask") return `Application to ${firm}`;
  if (templateType === "linkedin") return ``;
  return `Introduction request`;
}

/** Contact-page template types → the shared email writer's kinds. */
export const TEMPLATE_TO_KIND = {
  "cold-outreach": "cold",
  "thank-you": "thank-you",
  "follow-up": "follow-up",
  "re-engage": "re-engage",
  bump: "bump",
  "referral-ask": "referral-ask",
  linkedin: "linkedin",
  "request-intro": "intro-request",
} as const satisfies Record<EmailTemplateType, string>;
