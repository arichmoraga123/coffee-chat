import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { anthropicMessage, getAnthropicApiKey } from "@/lib/anthropic";
import { contactProfileBlock } from "@/lib/contact-profile";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getAnthropicApiKey()) {
    return NextResponse.json({ error: "AI is not configured (ANTHROPIC_API_KEY)." }, { status: 503 });
  }

  const { id: contactId } = await params;
  const body = (await req.json().catch(() => ({}))) as { targetPerson?: string };
  const target = String(body.targetPerson ?? "").trim();
  if (!target) {
    return NextResponse.json({ error: "targetPerson is required" }, { status: 400 });
  }

  const [contact, me] = await Promise.all([
    prisma.contact.findFirst({
      where: { id: contactId, userId },
      include: { firm: true, interactions: { orderBy: { date: "desc" }, take: 5 } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, recruitingTarget: true, targetFirms: true, dailyGoal: true },
    }),
  ]);

  if (!contact || !me) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userCtx = [
    `Sender name: ${me.name}`,
    me.recruitingTarget.length ? `Recruiting focus: ${me.recruitingTarget.join(", ")}` : null,
    me.targetFirms.length ? `Target firms: ${me.targetFirms.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = [
    `Draft an email FROM ${me.name} TO ${contact.fullName} (the contact below) asking ${contact.fullName} for an introduction or warm connection to: ${target}.`,
    "",
    "The email should be polite, specific, and easy to forward. Under 200 words. Mention why the intro would be valuable and offer to make it easy (e.g. blurb they can paste).",
    "",
    "Contact you're asking (they work at " + contact.firm.name + "):",
    contactProfileBlock(contact),
    "",
    "Recent context (interactions):",
    contact.interactions.length
      ? contact.interactions.map((i) => `${i.date.toISOString().slice(0, 10)} ${i.type}`).join("\n")
      : "(none)",
    "",
    "Sender recruiting context:",
    userCtx,
  ].join("\n");

  try {
    const text = await anthropicMessage(prompt, {
      usageLog: { userId, feature: "intro" },
    });
    return NextResponse.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
