import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { getAnthropicApiKey } from "@/lib/anthropic";
import { draftToText, generateEmail } from "@/lib/email-ai";
import { ndjsonResponse, throttle } from "@/lib/ai-stream";

const partialText = (p: { subjects: string[]; body: string }) => (p.subjects[0] ? `Subject: ${p.subjects[0]}\n\n${p.body}` : p.body);
import { EMAIL_TEMPLATE_TYPES, TEMPLATE_TO_KIND, type EmailTemplateType } from "@/lib/email-template-types";

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
    extra?: string;
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
      select: { id: true },
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

  return ndjsonResponse(async (send) => {
    const live = throttle((p: { subjects: string[]; body: string }) => send({ type: "partial", text: partialText(p) }));
    const history = await prisma.interaction.findMany({ where: { userId, contactId }, orderBy: { date: "desc" }, take: 3 });
    const draft = await generateEmail({
      userId,
      kind: TEMPLATE_TO_KIND[templateType],
      contact,
      interaction: lastInteraction,
      history: history.filter((h) => h.id !== lastInteraction?.id),
      extra: body.extra,
      feature: "contact-email",
      onPartial: live.push,
    });
    live.flush();
    const text = draftToText(draft);

    await prisma.contactEmailDraft.create({
      data: {
        contactId,
        userId,
        templateType,
        content: text,
      },
    });

    return { text, draft, templateType };
  });
}
