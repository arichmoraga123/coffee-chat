import { prisma } from "@/lib/prisma";
import { KINDS, CATEGORY_LABEL, type NotifyKind } from "@/lib/notification-kinds";
import { appUrl, emailHtml, flushOutbound, smsEnabled, unsubscribeUrl } from "@/lib/outbound";

/**
 * The one way to notify someone (K.1): writes the in-app notification, then queues email and text according
 * to their preferences. Texts never go out during quiet hours; they wait for quietEnd. In-app always shows.
 */

export type NotifyPayload = {
  title: string;
  body: string;
  /** In-app path, e.g. "/tasks". */
  url: string;
  email?: { subject: string; intro?: string; lines?: string[]; cta?: string };
  /** Short text message; omitted → no SMS. */
  sms?: string;
};

export async function getPrefs(userId: string) {
  return prisma.notificationPref.upsert({ where: { userId }, create: { userId }, update: {} });
}

function localHour(tz: string, at: Date) {
  try {
    return Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: tz }).format(at));
  } catch {
    return Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "America/New_York" }).format(at));
  }
}

export function isQuiet(hour: number, start: number, end: number) {
  if (start === end) return false;
  return start > end ? hour >= start || hour < end : hour >= start && hour < end;
}

/** Next moment outside quiet hours (top of the hour), or now. */
export function quietUntil(tz: string, start: number, end: number, now = new Date()): Date {
  if (!isQuiet(localHour(tz, now), start, end)) return now;
  const t = new Date(now);
  t.setUTCMinutes(0, 0, 0);
  for (let i = 0; i < 25; i++) {
    t.setUTCHours(t.getUTCHours() + 1);
    if (!isQuiet(localHour(tz, t), start, end)) return t;
  }
  return now;
}

export async function notify(userId: string, kind: NotifyKind, p: NotifyPayload, opts: { flush?: boolean } = {}) {
  const def = KINDS[kind];
  const pref = await getPrefs(userId);
  const n = await prisma.notification.create({ data: { userId, kind, title: p.title.slice(0, 200), body: p.body.slice(0, 1000), url: p.url } });
  const allowed = pref[def.category];
  const queued: string[] = [];
  if (allowed && pref.email && p.email) {
    const link = appUrl(p.url);
    await prisma.outboundMessage.create({
      data: {
        userId,
        channel: "email",
        kind,
        subject: p.email.subject,
        url: link,
        body: emailHtml({
          heading: p.title,
          intro: p.email.intro ?? p.body,
          lines: p.email.lines,
          cta: { label: p.email.cta ?? "Open in Prospect", url: link },
          unsubscribeUrl: unsubscribeUrl(pref.unsubscribeToken, def.category),
          categoryLabel: CATEGORY_LABEL[def.category],
        }),
      },
    });
    queued.push("email");
  }
  if (allowed && def.sms && p.sms && smsEnabled() && pref.sms && pref.phone && pref.phoneVerifiedAt && pref.smsConsentAt) {
    await prisma.outboundMessage.create({
      data: { userId, channel: "sms", kind, body: p.sms, url: appUrl(p.url), sendAfter: quietUntil(pref.timezone, pref.quietStart, pref.quietEnd) },
    });
    queued.push("sms");
  }
  if (queued.length && opts.flush !== false) await flushOutbound({ userId }).catch((e) => console.error("outbound flush failed", e));
  return { id: n.id, queued };
}

/** Notify many users with the same payload (e.g. every admin and mentor). */
export async function notifyMany(userIds: string[], kind: NotifyKind, p: NotifyPayload) {
  for (const id of [...new Set(userIds)]) await notify(id, kind, p).catch((e) => console.error("notify failed", id, e));
}
