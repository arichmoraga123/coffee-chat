import type { EmailKind } from "@/lib/email-ai-kinds";

/**
 * Proven outreach templates for students recruiting into IB / PE. Placeholders in {{double braces}}
 * are filled from the generator form or left for the student to complete.
 */
export type ColdTemplate = {
  id: string;
  title: string;
  kind: EmailKind;
  whenToUse: string;
  subject: string;
  body: string;
  tips: string[];
};

export const COLD_TEMPLATES: ColdTemplate[] = [
  {
    id: "alumni",
    title: "Alumni from your school",
    kind: "cold",
    whenToUse: "The best cold email you can send. Same school is the strongest hook most students have.",
    subject: "{{school}} {{year}} — question about {{firm}} {{group}}",
    body: `Hi {{first}},

I'm a {{year_word}} at {{school}} in {{club}}, and I saw you went from {{school}} to {{group}} at {{firm}}. I'm recruiting for {{track}} and would really value hearing how you made that jump and what the group looks for.

Would you have 15 minutes for a quick call in the next couple of weeks? Happy to work around your schedule.

Best,
{{my_name}}
{{school}} '{{yy}}`,
    tips: ["Send Tuesday–Thursday, 7–9am their time.", "Bump once after 5–7 business days if no reply."],
  },
  {
    id: "specific-deal",
    title: "Hook on a deal they worked on",
    kind: "cold",
    whenToUse: "When their firm or group was on a recent announced deal. Shows you did real homework.",
    subject: "{{school}} student — {{firm}}'s work on {{deal}}",
    body: `Hi {{first}},

I've been following {{firm}}'s role on {{deal}}, and {{one_specific_observation}}. I'm a {{year_word}} at {{school}} recruiting for {{track}}, and I'd love to hear how you think about deals like that from the {{group}} seat.

Would you be open to a 15-minute call sometime in the next two weeks?

Best,
{{my_name}}
{{school}} '{{yy}}`,
    tips: ["Keep the deal comment to one sentence and make sure it's accurate.", "Never imply you know non-public details."],
  },
  {
    id: "shared-background",
    title: "Shared hometown, club, or sport",
    kind: "cold",
    whenToUse: "No school overlap, but you share a hometown, high school, sport, or Greek org.",
    subject: "Fellow {{shared_thing}} — question about {{firm}}",
    body: `Hi {{first}},

I noticed we're both {{shared_thing}}, and I'm hoping you'd be open to sharing some perspective. I'm a {{year_word}} at {{school}} recruiting for {{track}}, and your path into {{group}} at {{firm}} is close to what I'm aiming for.

Would you have 15 minutes for a call in the next couple of weeks?

Best,
{{my_name}}
{{school}} '{{yy}}`,
    tips: ["Lead with the shared detail; it's the reason they'll read the rest."],
  },
  {
    id: "referred",
    title: "Someone referred you",
    kind: "cold",
    whenToUse: "A mutual contact suggested you reach out. Put their name in the first line and the subject.",
    subject: "{{referrer}} suggested I reach out",
    body: `Hi {{first}},

{{referrer}} suggested I reach out. I'm a {{year_word}} at {{school}} recruiting for {{track}}, and {{referrer_first}} mentioned you'd have a great perspective on {{topic}}.

Would you have 15 minutes for a quick call over the next couple of weeks?

Best,
{{my_name}}
{{school}} '{{yy}}`,
    tips: ["Ask the referrer first if it's OK to use their name.", "CC the referrer only if they offered to make the intro."],
  },
  {
    id: "info-session",
    title: "After an info session or event",
    kind: "cold",
    whenToUse: "You met (or heard) them at an info session, career fair, or club event.",
    subject: "Great meeting you at {{event}}",
    body: `Hi {{first}},

Thanks for speaking at {{event}}. Your point about {{what_they_said}} stuck with me. I'm a {{year_word}} at {{school}} recruiting for {{track}} and would love to continue the conversation.

Would you have 15 minutes for a call in the next couple of weeks?

Best,
{{my_name}}
{{school}} '{{yy}}`,
    tips: ["Send within 48 hours of the event while they still remember it."],
  },
  {
    id: "bump",
    title: "Bump (no reply after a week)",
    kind: "bump",
    whenToUse: "Reply on the same thread 5–7 business days after a cold email with no response.",
    subject: "Re: {{original_subject}}",
    body: `Hi {{first}},

Just bumping this in case it got buried. I know things are busy, so even 10 minutes in the next few weeks would be great.

Best,
{{my_name}}`,
    tips: ["Reply on the original thread so they see your first note.", "Only bump once or twice, a week apart."],
  },
  {
    id: "thank-you",
    title: "Thank-you after a call",
    kind: "thank-you",
    whenToUse: "Within 24 hours of every call. Reference something specific they said.",
    subject: "Thank you — {{firm}} conversation",
    body: `Hi {{first}},

Thank you for taking the time to talk today. I especially appreciated your advice on {{advice}}, and I'm going to {{what_youll_do}}.

{{optional_followup_line}}

Best,
{{my_name}}`,
    tips: ["Same day is best. Log what they said in the app so your follow-ups stay specific."],
  },
  {
    id: "update",
    title: "Update / keep-warm touchpoint",
    kind: "follow-up",
    whenToUse: "4–8 weeks after a call, or right before applications open.",
    subject: "Quick update — took your advice",
    body: `Hi {{first}},

I wanted to share a quick update: after our conversation, I {{what_you_did}}, and it's already helped with {{result}}.

Thanks again for the advice. I hope {{something_relevant_to_them}} is going well.

Best,
{{my_name}}`,
    tips: ["No ask needed. This is what turns a contact into an advocate."],
  },
  {
    id: "referral-ask",
    title: "Ask for a referral / resume pass",
    kind: "referral-ask",
    whenToUse: "Only after at least one good conversation, when you've applied or are about to.",
    subject: "{{firm}} {{program}} application",
    body: `Hi {{first}},

I hope things are going well. I just submitted my application for the {{program}} at {{firm}}, and our conversation about {{topic}} is a big part of why.

If you're comfortable, would you be willing to pass my resume along or flag my application to the team? Completely understand if not. I've attached my resume either way.

Best,
{{my_name}}`,
    tips: ["Attach your resume as a PDF named First_Last_Resume.pdf.", "Give them an easy out."],
  },
  {
    id: "linkedin",
    title: "LinkedIn connection note",
    kind: "linkedin",
    whenToUse: "When you can't find their email. 280 characters max.",
    subject: "",
    body: `Hi {{first}} — {{school}} {{year_word}} recruiting for {{track}}. Your move from {{prior}} to {{group}} at {{firm}} is the path I'm aiming for. Would you be open to a quick chat sometime? Thanks!`,
    tips: ["Personalize the middle sentence; generic notes get ignored."],
  },
];
