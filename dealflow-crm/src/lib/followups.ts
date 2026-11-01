/**
 * Follow-up rules (Phase J.1). One pure function: given a contact's interactions, return the next reminder
 * (or none). Used by the Contacts table, Tasks page, Home "This week" card, sidebar badge, and the daily digest.
 */

export const INTERACTION_KINDS = {
  cold_email: { label: "Cold email sent", legacy: "EMAIL" },
  linkedin_message: { label: "LinkedIn message sent", legacy: "LINKEDIN" },
  followup_email: { label: "Follow-up email sent", legacy: "EMAIL" },
  replied: { label: "They replied", legacy: "EMAIL" },
  coffee_chat: { label: "Coffee chat", legacy: "COFFEE_CHAT" },
  phone_call: { label: "Phone call", legacy: "CALL" },
  video_call: { label: "Video call", legacy: "CALL" },
  in_person: { label: "In-person meeting", legacy: "IN_PERSON" },
  thank_you: { label: "Thank-you sent", legacy: "EMAIL" },
  referral: { label: "Referral / resume sent", legacy: "EMAIL" },
  interview: { label: "Interview", legacy: "IN_PERSON" },
  event: { label: "Event / info session", legacy: "IN_PERSON" },
} as const;
export type InteractionKind = keyof typeof INTERACTION_KINDS;
export const KIND_OPTIONS = (Object.keys(INTERACTION_KINDS) as InteractionKind[]).map((k) => ({ value: k, label: INTERACTION_KINDS[k].label }));

const CONVERSATION: InteractionKind[] = ["coffee_chat", "phone_call", "video_call", "in_person", "interview"];
const COLD: InteractionKind[] = ["cold_email", "linkedin_message"];

/** Older rows only have the coarse enum. */
export function kindOf(i: { kind?: string | null; type?: string | null; notes?: string | null }): InteractionKind {
  if (i.kind && i.kind in INTERACTION_KINDS) return i.kind as InteractionKind;
  switch (i.type) {
    case "COFFEE_CHAT":
      return "coffee_chat";
    case "CALL":
      return "phone_call";
    case "IN_PERSON":
      return "in_person";
    case "LINKEDIN":
      return "linkedin_message";
    default:
      return /thank/i.test(i.notes ?? "") ? "thank_you" : /repl/i.test(i.notes ?? "") ? "replied" : "cold_email";
  }
}

/** Kind label → key, accepting the template's wording and common variants ("Coffee Chat", "call"). */
export function parseKind(label: string): InteractionKind | null {
  const l = label.trim().toLowerCase().replace(/[^a-z/ ]/g, " ").replace(/\s+/g, " ").trim();
  for (const [k, v] of Object.entries(INTERACTION_KINDS)) if (v.label.toLowerCase().replace(/[^a-z/ ]/g, " ").replace(/\s+/g, " ").trim() === l) return k as InteractionKind;
  const aliases: [RegExp, InteractionKind][] = [
    [/^cold|^outreach|^intro email|^email sent$/, "cold_email"],
    [/linkedin/, "linkedin_message"],
    [/follow ?up|bump/, "followup_email"],
    [/repl|responded/, "replied"],
    [/coffee/, "coffee_chat"],
    [/video|zoom|teams/, "video_call"],
    [/phone|call/, "phone_call"],
    [/in person|meeting|lunch|dinner/, "in_person"],
    [/thank/, "thank_you"],
    [/referr|resume/, "referral"],
    [/interview|superday/, "interview"],
    [/event|info session|career fair|panel|summit/, "event"],
  ];
  for (const [re, k] of aliases) if (re.test(l)) return k;
  return null;
}

export type FollowupInteraction = { id?: string; date: Date; kind: InteractionKind; nextStep?: string | null; nextStepDue?: Date | null };
export type FollowupContact = { list?: string | null; doNotContact?: boolean; notPursuing?: boolean; deletedAt?: Date | null; priority?: string | null };

export type FollowupKind = "bump1" | "bump2" | "reply" | "thank_you" | "update" | "check_in" | "referral_check" | "event_followup" | "next_step";
export type Followup = {
  kind: FollowupKind;
  label: string;
  reason: string;
  due: Date;
  /** Email writer type to preselect from the task. */
  draft: "bump" | "thank-you" | "follow-up" | "re-engage" | "cold" | null;
  /** Unique per rule + triggering interaction, so one open task per situation. */
  ruleKey: string;
};
export type FollowupResult = { followup: Followup | null; goneCold: boolean; reengageOn: Date | null };

const DAY = 86_400_000;
export function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * DAY);
}
export function addBusinessDays(d: Date, n: number) {
  const out = new Date(d);
  let left = n;
  while (left > 0) {
    out.setUTCDate(out.getUTCDate() + 1);
    const wd = out.getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return out;
}
const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const CHECK_IN_WEEKS: Record<string, number> = { A: 6, B: 8, C: 12 };

export function nextFollowup(contact: FollowupContact, interactions: FollowupInteraction[]): FollowupResult {
  const none: FollowupResult = { followup: null, goneCold: false, reengageOn: null };
  if (contact.deletedAt || contact.doNotContact || contact.notPursuing || contact.list === "network") return none;
  const xs = [...interactions].sort((a, b) => a.date.getTime() - b.date.getTime());
  const last = xs[xs.length - 1];
  if (!last) return none;
  const key = (k: string, i: FollowupInteraction) => `${k}:${i.id ?? i.date.toISOString().slice(0, 10)}`;
  const make = (kind: FollowupKind, label: string, reason: string, due: Date, draft: Followup["draft"], trigger: FollowupInteraction): FollowupResult => ({
    followup: { kind, label, reason, due: last.nextStepDue ?? due, draft, ruleKey: key(kind, trigger) },
    goneCold: false,
    reengageOn: null,
  });

  // An explicit Next Step Due always wins.
  if (last.nextStepDue) {
    return {
      followup: {
        kind: "next_step",
        label: last.nextStep ? `Next step: ${last.nextStep}` : "Next step",
        reason: `${INTERACTION_KINDS[last.kind].label} ${fmt(last.date)}`,
        due: last.nextStepDue,
        draft: last.kind === "replied" ? null : "follow-up",
        ruleKey: key("next_step", last),
      },
      goneCold: false,
      reengageOn: null,
    };
  }

  const priority = (contact.priority ?? "B").trim().charAt(0).toUpperCase();
  const checkInWeeks = CHECK_IN_WEEKS[priority] ?? 8;

  switch (last.kind) {
    case "replied":
      return make("reply", "Reply", `They replied ${fmt(last.date)}`, addBusinessDays(last.date, 1), null, last);
    case "referral":
      return make("referral_check", "Check in on the referral", `Referral / resume sent ${fmt(last.date)}`, addDays(last.date, 7), "follow-up", last);
    case "event":
      return make("event_followup", "Follow-up email", `Met at an event ${fmt(last.date)}`, addDays(last.date, 2), "cold", last);
    case "thank_you": {
      const convo = [...xs].reverse().find((i) => CONVERSATION.includes(i.kind));
      if (convo) return make("update", "Send an update", `Thank-you sent ${fmt(last.date)} after your ${INTERACTION_KINDS[convo.kind].label.toLowerCase()}`, addDays(last.date, 21), "follow-up", last);
      return make("check_in", "Check in", `Thank-you sent ${fmt(last.date)}`, addDays(last.date, checkInWeeks * 7), "follow-up", last);
    }
    default:
      break;
  }

  if (CONVERSATION.includes(last.kind)) {
    return make("thank_you", "Send thank-you", `${INTERACTION_KINDS[last.kind].label} ${fmt(last.date)}, no thank-you yet`, addDays(last.date, 1), "thank-you", last);
  }

  // Outbound emails: either part of an unanswered cold sequence (bumps) or a keep-warm update after a real conversation.
  const lastWarm = [...xs].reverse().find((i) => i.kind === "replied" || CONVERSATION.includes(i.kind) || i.kind === "thank_you" || i.kind === "referral");
  const sinceWarm = lastWarm ? xs.filter((i) => i.date.getTime() > lastWarm.date.getTime()) : xs;
  const coldIdx = sinceWarm.findIndex((i) => COLD.includes(i.kind));

  if (coldIdx >= 0 && !(lastWarm && CONVERSATION.includes(lastWarm.kind))) {
    const cold = sinceWarm[coldIdx];
    const bumps = sinceWarm.slice(coldIdx + 1).filter((i) => i.kind === "followup_email" || COLD.includes(i.kind));
    if (bumps.length === 0) {
      return make("bump1", "Bump #1", `${INTERACTION_KINDS[cold.kind].label} ${fmt(cold.date)}, no reply`, addBusinessDays(cold.date, 5), "bump", cold);
    }
    if (bumps.length === 1) {
      return make("bump2", "Bump #2", `Bump #1 sent ${fmt(bumps[0].date)}, still no reply`, addBusinessDays(bumps[0].date, 7), "bump", bumps[0]);
    }
    return { followup: null, goneCold: true, reengageOn: addDays(bumps[bumps.length - 1].date, 60) };
  }

  // Quiet after a real conversation (e.g. an update was sent): check in on the priority cadence.
  return make("check_in", "Check in", `Last touch ${fmt(last.date)} (${INTERACTION_KINDS[last.kind].label.toLowerCase()})`, addDays(last.date, checkInWeeks * 7), "follow-up", last);
}

/** Stage derived from the latest interaction when no Relationship Stage is given (Phase I.2). */
export function stageFromKind(kind: InteractionKind | null): string {
  switch (kind) {
    case null:
      return "Not contacted";
    case "cold_email":
    case "linkedin_message":
    case "followup_email":
      return "Emailed – no reply";
    case "replied":
      return "Replied";
    case "referral":
      return "Referred me";
    case "interview":
      return "Interviewing";
    default:
      return "Chatted";
  }
}
const STAGE_RANK: Record<string, number> = {
  "Not contacted": 0,
  "Emailed – no reply": 1,
  "Gone cold": 1,
  Replied: 2,
  "Call scheduled": 3,
  Chatted: 4,
  "Ongoing relationship": 5,
  "Referred me": 6,
  Interviewing: 7,
};

/** Stage after a new interaction: moves forward, never back ("Follow-up email sent" after a chat stays Chatted). "Not pursuing" is the student's call and stays. */
export function mergeStage(current: string | null | undefined, next: string): string {
  if (!current) return next;
  if (current === "Not pursuing") return current;
  const a = STAGE_RANK[current];
  const b = STAGE_RANK[next];
  if (a === undefined || b === undefined) return next;
  if (current === "Gone cold") return next;
  return b >= a ? next : current;
}

export const RELATIONSHIP_STAGES = ["Not contacted", "Emailed – no reply", "Replied", "Call scheduled", "Chatted", "Referred me", "Interviewing", "Gone cold", "Not pursuing"];
