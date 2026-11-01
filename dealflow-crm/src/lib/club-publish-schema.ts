import { z } from "zod";

/** Shared by the Post to club form and the API. Dates for events are Eastern wall-clock "YYYY-MM-DDTHH:mm". */
const file = z.object({ id: z.string().max(64), name: z.string().max(200), size: z.number().int().min(0), contentType: z.string().max(200), key: z.string().max(1000) });
const audience = z.union([z.object({ all: z.literal(true) }), z.object({ tracks: z.array(z.string().max(80)).min(1).max(30) }), z.object({ userIds: z.array(z.string().max(64)).min(1).max(500) })]);
const delivery = z.object({ feed: z.boolean(), inApp: z.boolean(), email: z.boolean(), text: z.boolean() });
const links = z.array(z.string().url().max(1000)).max(20);
const common = { title: z.string().trim().min(2).max(200), audience, delivery };

export const publishSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.enum(["resource", "assignment", "reading", "case_study"]),
    ...common,
    description: z.string().max(20_000).default(""),
    files: z.array(file).max(20).default([]),
    links: links.default([]),
    tags: z.array(z.string().max(40)).max(20).default([]),
    lessonIds: z.array(z.string().max(80)).max(20).default([]),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    allowDone: z.boolean().default(false),
  }),
  z.object({
    type: z.literal("project"),
    ...common,
    description: z.string().max(20_000).default(""),
    memberIds: z.array(z.string().max(64)).max(100).default([]),
    leadId: z.string().max(64).nullable().optional(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    status: z.enum(["planning", "active", "done"]).default("planning"),
    files: z.array(file).max(20).default([]),
    links: links.default([]),
  }),
  z.object({
    type: z.literal("event"),
    ...common,
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).nullable().optional(),
    location: z.string().max(300).default(""),
    meetingLink: z.string().url().max(1000).nullable().optional(),
    description: z.string().max(20_000).default(""),
    capacity: z.number().int().min(1).max(10_000).nullable().optional(),
    rsvpOn: z.boolean().default(true),
  }),
  z.object({
    type: z.literal("announcement"),
    ...common,
    body: z.string().trim().min(2).max(20_000),
    pinned: z.boolean().default(false),
  }),
]);
export type PublishInput = z.infer<typeof publishSchema>;

/** Eastern wall-clock time → UTC Date (handles EDT/EST). */
export function easternToUtc(local: string): Date {
  const [d, t] = local.split("T");
  for (const off of [4, 5]) {
    const guess = new Date(`${d}T${t}:00Z`);
    guess.setUTCHours(guess.getUTCHours() + off);
    const back = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .format(guess)
      .replace(", ", "T");
    if (back === local) return guess;
  }
  const fallback = new Date(`${d}T${t}:00Z`);
  fallback.setUTCHours(fallback.getUTCHours() + 5);
  return fallback;
}

/** UTC Date → Eastern "YYYY-MM-DDTHH:mm" (for editing). */
export function utcToEastern(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(d)
    .replace(", ", "T");
}
