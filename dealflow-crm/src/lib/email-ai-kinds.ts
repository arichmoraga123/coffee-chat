/** Email types the AI writer supports (client-safe). */
export const EMAIL_KINDS = {
  cold: {
    label: "Cold email",
    goal:
      "First contact. Ask for a 15-minute phone call. Structure: (1) who you are in one line (school, class year, club), (2) the single most specific reason you're writing to THIS person (shared school/hometown/club, a deal or group they worked on, their path from X to Y), (3) one-line ask with a time frame ('15 minutes in the next couple of weeks'), (4) offer flexibility. 70–120 words.",
  },
  "thank-you": {
    label: "Thank-you after a call",
    goal:
      "Send within 24 hours of a call. Thank them, then reference ONE or TWO concrete things they said (use their words from the notes), say what you'll do with their advice, and include any promised follow-up (resume attached, a name they offered to intro). End without asking for anything new. 60–110 words.",
  },
  "follow-up": {
    label: "Follow-up / update",
    goal:
      "A touchpoint weeks after a conversation. Lead with a real update tied to their advice ('I took your advice and…'), or a relevant piece of news about their firm or a recent deal. Keep the relationship warm; at most one light ask. 60–110 words.",
  },
  bump: {
    label: "Bump (no reply)",
    goal:
      "They didn't reply to a cold email 5–7 business days ago. Two to three sentences, written as a reply on the same thread: acknowledge they're busy, restate the ask in one line, make it easy to say yes. Never guilt-trip. Under 60 words.",
  },
  "re-engage": {
    label: "Re-engage",
    goal:
      "It's been months. Reference the past conversation specifically, give a short update on what you've done since, and propose a low-pressure catch-up (especially before recruiting season). 70–110 words.",
  },
  "referral-ask": {
    label: "Referral / resume ask",
    goal:
      "You've already spoken at least once. Tell them you applied (or are about to) to a specific program, ask if they'd be comfortable passing your resume along or flagging your application, and give them an easy out. Attach-ready. 70–110 words.",
  },
  "intro-request": {
    label: "Intro request",
    goal:
      "Ask a contact to introduce you to someone specific. Say who and why that person in one line, and offer a 2-sentence forwardable blurb about yourself they can paste. 80–130 words including the blurb.",
  },
  linkedin: {
    label: "LinkedIn connection note",
    goal: "A LinkedIn connection request note. Hard limit: 280 characters. One specific hook plus a soft ask to connect or chat. No subject line needed (still return subjects but they can be generic).",
  },
} as const;
export type EmailKind = keyof typeof EMAIL_KINDS;
