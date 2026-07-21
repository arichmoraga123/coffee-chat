import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { anthropicMessage, getAnthropicApiKey } from "@/lib/anthropic";
import { contactProfileBlock } from "@/lib/contact-profile";
import {
  EMAIL_TEMPLATE_TYPES,
  type EmailTemplateType,
} from "@/lib/email-template-types";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getAnthropicApiKey()) {
    return NextResponse.json({ error: "AI is not configured (ANTHROPIC_API_KEY)." }, { status: 503 });
  }

  const { id: contactId } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    templateType?: EmailTemplateType;
    interactionId?: string;
  };
  const templateType = (body.templateType ?? "cold-outreach") as EmailTemplateType;
  const template = EMAIL_TEMPLATE_TYPES[templateType];
  if (!template) {
    return NextResponse.json({ error: "Invalid template type" }, { status: 400 });
  }

  const [contact, me, lastInteraction] = await Promise.all([
    prisma.contact.findFirst({
      where: { id: contactId, userId },
      include: { firm: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        recruitingTarget: true,
        targetFirms: true,
        school: { select: { name: true, shortName: true } },
      },
    }),
    body.interactionId
      ? prisma.interaction.findFirst({
          where: { id: body.interactionId, userId, contactId },
        })
      : prisma.interaction.findFirst({
          where: { userId, contactId },
          orderBy: { date: "desc" },
        }),
  ]);

  if (!contact || !me) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const schoolLabel = me.school?.shortName ?? me.school?.name ?? "their school";
  const userBlock = [
    `Name: ${me.name}`,
    `School: ${schoolLabel}`,
    me.recruitingTarget.length ? `Recruiting goals: ${me.recruitingTarget.join(", ")}` : null,
    me.targetFirms.length ? `Target firms: ${me.targetFirms.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const interactionBlock = lastInteraction
    ? `Last interaction (${lastInteraction.type} on ${lastInteraction.date.toISOString().slice(0, 10)}): ${lastInteraction.notes ?? "no notes"}`
    : "No prior interactions logged.";

  const prompt = [
    `Draft a ${template.label} email from ${me.name} to ${contact.fullName}.`,
    "",
    template.prompt,
    "",
    "Contact profile:",
    contactProfileBlock(contact),
    "",
    "Sender context:",
    userBlock,
    "",
    interactionBlock,
    "",
    "Output only the email body. No subject line unless naturally included.",
  ].join("\n");

  try {
    const text = await anthropicMessage(prompt, {
      maxTokens: 800,
      usageLog: { userId, feature: "contact-email" },
    });

    await prisma.contactEmailDraft.create({
      data: {
        contactId,
        userId,
        templateType,
        content: text,
      },
    });

    return NextResponse.json({ text, templateType });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
