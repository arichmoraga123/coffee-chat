import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { categoryOf } from "@/lib/notification-kinds";

/** Email (Resend) and SMS (Twilio) delivery for queued OutboundMessage rows. Keys come from the environment only. */

export const smsEnabled = () => process.env.SMS_ENABLED === "true" && Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
export const emailEnabled = () => Boolean(process.env.RESEND_API_KEY);
export const SMS_DAILY_CAP = 2;
export const SMS_CONSENT_TEXT = "I agree to receive follow-up and club reminder texts from Prospect. Msg & data rates may apply. Reply STOP to opt out.";

export function appUrl(path = "") {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  const raw = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? (vercel ? `https://${vercel.replace(/^https?:\/\//, "")}` : "http://localhost:3000");
  const base = raw.replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export const unsubscribeUrl = (token: string, category: string) => appUrl(`/api/notifications/unsubscribe?t=${encodeURIComponent(token)}&c=${encodeURIComponent(category)}`);

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Plain, professional email in the app's colors. `lines` are pre-escaped HTML rows. */
export function emailHtml(opts: { heading: string; intro?: string; lines?: string[]; cta?: { label: string; url: string }; unsubscribeUrl: string; categoryLabel: string }) {
  const rows = (opts.lines ?? []).map((l) => `<tr><td style="padding:10px 0;border-top:1px solid #e7e5e0;font-size:14px;line-height:1.5;color:#1c1f1d">${l}</td></tr>`).join("");
  return `<!doctype html><html><body style="margin:0;background:#f6f5f2;font-family:Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f5f2;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e5e0;border-radius:10px">
<tr><td style="padding:20px 24px 0"><span style="display:inline-block;background:#18453b;color:#fff;font-weight:700;font-size:13px;border-radius:6px;padding:4px 8px">P</span> <span style="font-size:14px;font-weight:600;color:#1c1f1d;vertical-align:middle">Prospect</span></td></tr>
<tr><td style="padding:16px 24px 4px"><h1 style="margin:0;font-size:18px;line-height:1.3;color:#1c1f1d">${esc(opts.heading)}</h1>${opts.intro ? `<p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:#4a504c">${esc(opts.intro)}</p>` : ""}</td></tr>
${rows ? `<tr><td style="padding:8px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>` : ""}
${opts.cta ? `<tr><td style="padding:12px 24px 24px"><a href="${esc(opts.cta.url)}" style="display:inline-block;background:#18453b;color:#fff;text-decoration:none;font-weight:600;font-size:14px;border-radius:6px;padding:10px 16px">${esc(opts.cta.label)}</a></td></tr>` : ""}
</table>
<p style="max-width:560px;margin:12px auto 0;font-size:12px;line-height:1.5;color:#7a807c">You're getting this because ${esc(opts.categoryLabel.toLowerCase())} emails are on in Prospect. <a href="${esc(opts.unsubscribeUrl)}" style="color:#7a807c">Unsubscribe from ${esc(opts.categoryLabel.toLowerCase())} emails</a>.</p>
</td></tr></table></body></html>`;
}

async function sendEmail(to: string, subject: string, html: string, unsubscribeUrl?: string): Promise<string | null> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return "RESEND_API_KEY not set";
  const from = process.env.EMAIL_FROM ?? process.env.RESEND_FROM ?? "Prospect <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      ...(unsubscribeUrl ? { headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
    }),
  }).catch((e: unknown) => ({ ok: false, status: 0, text: async () => String(e) }));
  return res.ok ? null : `Resend ${res.status}: ${(await res.text()).slice(0, 300)}`;
}

async function sendSms(to: string, body: string): Promise<string | null> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const service = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!sid || !token || !service) return "Twilio not configured";
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, MessagingServiceSid: service, Body: body.slice(0, 320) }),
  }).catch((e: unknown) => ({ ok: false, status: 0, text: async () => String(e) }));
  return res.ok ? null : `Twilio ${res.status}: ${(await res.text()).slice(0, 300)}`;
}

/** Twilio Verify: send a code, or check one. */
export async function twilioVerify(action: "send" | "check", phone: string, code?: string): Promise<{ ok: boolean; error?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const service = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid || !token || !service) return { ok: false, error: "Text messages aren't set up yet." };
  const url = `https://verify.twilio.com/v2/Services/${service}/${action === "send" ? "Verifications" : "VerificationCheck"}`;
  const params: Record<string, string> = action === "send" ? { To: phone, Channel: "sms" } : { To: phone, Code: code ?? "" };
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  }).catch(() => null);
  if (!res?.ok) return { ok: false, error: action === "send" ? "Couldn't send a code to that number." : "That code didn't work." };
  if (action === "check") {
    const d = (await res.json().catch(() => ({}))) as { status?: string };
    return d.status === "approved" ? { ok: true } : { ok: false, error: "That code didn't work." };
  }
  return { ok: true };
}

/** Validates X-Twilio-Signature (HMAC-SHA1 of the URL plus sorted POST params). */
export function validTwilioSignature(url: string, params: Record<string, string>, signature: string | null): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token || !signature) return false;
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const expected = createHmac("sha1", token).update(data).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Sends queued messages that are due. Each SMS re-checks opt-in and the daily cap at send time. */
export async function flushOutbound(opts: { userId?: string; limit?: number } = {}) {
  const due = await prisma.outboundMessage.findMany({
    where: { sentAt: null, error: null, sendAfter: { lte: new Date() }, ...(opts.userId ? { userId: opts.userId } : {}) },
    orderBy: { createdAt: "asc" },
    take: opts.limit ?? 200,
  });
  let sent = 0;
  for (const m of due) {
    let error: string | null = null;
    if (m.channel === "email") {
      const [user, pref] = await Promise.all([
        prisma.user.findUnique({ where: { id: m.userId }, select: { email: true, accountActive: true } }),
        prisma.notificationPref.findUnique({ where: { userId: m.userId }, select: { unsubscribeToken: true } }),
      ]);
      const cat = categoryOf(m.kind);
      const unsub = pref && cat ? unsubscribeUrl(pref.unsubscribeToken, cat) : undefined;
      if (!user?.accountActive || !user.email || user.email.endsWith(".local")) error = "No deliverable email";
      else error = await sendEmail(user.email, m.subject ?? "Prospect", m.body, unsub);
    } else {
      const pref = await prisma.notificationPref.findUnique({ where: { userId: m.userId } });
      const since = new Date(Date.now() - 24 * 3_600_000);
      const today = await prisma.outboundMessage.count({ where: { userId: m.userId, channel: "sms", sentAt: { gte: since } } });
      if (!smsEnabled()) error = "SMS_ENABLED is off";
      else if (!pref?.sms || !pref.phone || !pref.phoneVerifiedAt || !pref.smsConsentAt) error = "Not opted in";
      else if (today >= SMS_DAILY_CAP) error = "Daily text limit reached";
      else error = await sendSms(pref.phone, m.body);
    }
    await prisma.outboundMessage.update({ where: { id: m.id }, data: error ? { error } : { sentAt: new Date() } });
    if (!error) sent++;
  }
  return { checked: due.length, sent };
}

/** US numbers → E.164. */
export function normalizePhone(raw: string): string | null {
  const s = raw.trim();
  const digits = s.replace(/\D/g, "");
  if (s.startsWith("+") && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

