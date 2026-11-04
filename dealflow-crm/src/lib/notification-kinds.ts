/** Notification kinds, the preference that controls each, and whether it may be texted. Client-safe. */

export type PrefCategory = "followupDigest" | "mentorAlerts" | "clubPosts" | "challenges" | "messages" | "eventReminders";

export const CATEGORY_LABEL: Record<PrefCategory, string> = {
  followupDigest: "Daily follow-up digest",
  mentorAlerts: "Mentor questions",
  clubPosts: "Club posts",
  challenges: "Challenges",
  messages: "Messages",
  eventReminders: "Event and application deadline reminders",
};

export const KINDS = {
  followup_digest: { category: "followupDigest", sms: true },
  mentor_question: { category: "mentorAlerts", sms: true },
  mentor_reminder: { category: "mentorAlerts", sms: true },
  mentor_answer: { category: "mentorAlerts", sms: false },
  club_post: { category: "clubPosts", sms: false },
  event_reminder: { category: "eventReminders", sms: true },
  opening_reminder: { category: "eventReminders", sms: true },
  challenge: { category: "challenges", sms: false },
  group_duel: { category: "challenges", sms: false },
  message: { category: "messages", sms: false },
} as const satisfies Record<string, { category: PrefCategory; sms: boolean }>;

export type NotifyKind = keyof typeof KINDS;
export const categoryOf = (kind: string): PrefCategory | null => (kind in KINDS ? KINDS[kind as NotifyKind].category : null);
