import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { getPrefs } from "@/lib/notify";
import { emailEnabled, smsEnabled } from "@/lib/outbound";

const patch = z
  .object({
    email: z.boolean(),
    sms: z.boolean(),
    timezone: z.string().max(64),
    quietStart: z.number().int().min(0).max(23),
    quietEnd: z.number().int().min(0).max(23),
    followupDigest: z.boolean(),
    mentorAlerts: z.boolean(),
    clubPosts: z.boolean(),
    challenges: z.boolean(),
    messages: z.boolean(),
    eventReminders: z.boolean(),
  })
  .partial();

const shape = (p: Awaited<ReturnType<typeof getPrefs>>) => ({
  email: p.email,
  sms: p.sms,
  phone: p.phone,
  phoneVerified: Boolean(p.phoneVerifiedAt),
  timezone: p.timezone,
  quietStart: p.quietStart,
  quietEnd: p.quietEnd,
  followupDigest: p.followupDigest,
  mentorAlerts: p.mentorAlerts,
  clubPosts: p.clubPosts,
  challenges: p.challenges,
  messages: p.messages,
  eventReminders: p.eventReminders,
  smsAvailable: smsEnabled(),
  emailAvailable: emailEnabled(),
});

export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(shape(await getPrefs(userId)));
}

export async function PATCH(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid settings." }, { status: 400 });
  const data = parsed.data;
  if (data.timezone) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: data.timezone });
    } catch {
      return NextResponse.json({ error: "Unknown time zone." }, { status: 400 });
    }
  }
  const cur = await getPrefs(userId);
  // Texts can only be turned on after the phone is verified and consent is recorded (see /phone).
  if (data.sms && (!cur.phoneVerifiedAt || !cur.smsConsentAt)) delete data.sms;
  const p = await prisma.notificationPref.update({ where: { userId }, data });
  return NextResponse.json(shape(p));
}
