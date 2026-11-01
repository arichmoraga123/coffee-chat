import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { getPrefs } from "@/lib/notify";
import { SMS_CONSENT_TEXT, normalizePhone, smsEnabled, twilioVerify } from "@/lib/outbound";

/**
 * "Text me" opt-in: { action: "send", phone } sends a code; { action: "verify", phone, code, consent: true }
 * checks it and records the exact consent text and time; { action: "off" } turns texts off.
 */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { action?: string; phone?: string; code?: string; consent?: boolean };
  if (body.action === "off") {
    await getPrefs(userId);
    await prisma.notificationPref.update({ where: { userId }, data: { sms: false } });
    return NextResponse.json({ ok: true });
  }
  if (!smsEnabled()) return NextResponse.json({ error: "Text messages aren't turned on yet." }, { status: 503 });
  const phone = normalizePhone(String(body.phone ?? ""));
  if (!phone) return NextResponse.json({ error: "Enter a 10-digit US mobile number." }, { status: 400 });
  if (body.action === "send") {
    const r = await twilioVerify("send", phone);
    return r.ok ? NextResponse.json({ ok: true, phone }) : NextResponse.json({ error: r.error }, { status: 400 });
  }
  if (body.action === "verify") {
    if (body.consent !== true) return NextResponse.json({ error: "Check the box to agree to texts." }, { status: 400 });
    const r = await twilioVerify("check", phone, String(body.code ?? "").trim());
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
    await getPrefs(userId);
    const now = new Date();
    await prisma.notificationPref.update({ where: { userId }, data: { phone, phoneVerifiedAt: now, smsConsentAt: now, smsConsentText: SMS_CONSENT_TEXT, sms: true } });
    return NextResponse.json({ ok: true, phone });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
