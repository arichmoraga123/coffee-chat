import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appUrl, validTwilioSignature } from "@/lib/outbound";

/**
 * Twilio Messaging Service webhook (incoming messages / opt-out events). Advanced Opt-Out replies to STOP and HELP
 * itself; this keeps our record in sync so we never queue texts for someone who opted out.
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [k, v] of form.entries()) params[k] = String(v);
  const url = appUrl("/api/notifications/twilio");
  if (!validTwilioSignature(url, params, req.headers.get("x-twilio-signature"))) {
    return NextResponse.json({ error: "Bad signature" }, { status: 403 });
  }
  const from = params.From ?? "";
  const optOut = params.OptOutType?.toUpperCase() === "STOP" || /^(stop|stopall|unsubscribe|cancel|end|quit)$/i.test((params.Body ?? "").trim());
  if (from && optOut) await prisma.notificationPref.updateMany({ where: { phone: from }, data: { sms: false } });
  return new NextResponse("<Response/>", { headers: { "Content-Type": "text/xml" } });
}
