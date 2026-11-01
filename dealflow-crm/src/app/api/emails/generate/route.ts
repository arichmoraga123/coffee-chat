import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { getAnthropicApiKey } from "@/lib/anthropic";
import { generateEmail } from "@/lib/email-ai";
import { EMAIL_KINDS } from "@/lib/email-ai-kinds";
import { COLD_TEMPLATES } from "@/lib/cold-email-templates";

const Body = z.object({
  kind: z.enum(Object.keys(EMAIL_KINDS) as [keyof typeof EMAIL_KINDS, ...(keyof typeof EMAIL_KINDS)[]]),
  contactId: z.string().optional(),
  manual: z
    .object({
      name: z.string().trim().min(1).max(120),
      firm: z.string().trim().max(120).optional(),
      title: z.string().trim().max(120).optional(),
      group: z.string().trim().max(120).optional(),
      school: z.string().trim().max(120).optional(),
      hook: z.string().trim().max(600).optional(),
      notes: z.string().trim().max(1500).optional(),
    })
    .optional(),
  templateId: z.string().optional(),
  extra: z.string().trim().max(1500).optional(),
  save: z.boolean().optional(),
});

/** The email writer: from a saved contact or a person you type in, optionally starting from a template. */
export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getAnthropicApiKey()) return NextResponse.json({ error: "AI is not configured (ANTHROPIC_API_KEY)." }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Fill in who the email is for." }, { status: 400 });
  const b = parsed.data;
  if (!b.contactId && !b.manual) return NextResponse.json({ error: "Pick a contact or enter who it's for." }, { status: 400 });

  const contact = b.contactId ? await prisma.contact.findFirst({ where: { id: b.contactId, userId }, include: { firm: true } }) : null;
  if (b.contactId && !contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  const history = contact ? await prisma.interaction.findMany({ where: { userId, contactId: contact.id }, orderBy: { date: "desc" }, take: 4 }) : [];
  const template = b.templateId ? COLD_TEMPLATES.find((t) => t.id === b.templateId) : undefined;

  try {
    const draft = await generateEmail({
      userId,
      kind: b.kind,
      contact: contact ?? undefined,
      manual: contact ? undefined : b.manual,
      interaction: history[0] ?? null,
      history: history.slice(1),
      extra: b.extra,
      templateBody: template ? `Subject: ${template.subject}\n\n${template.body}` : undefined,
      feature: "contact-email",
    });
    if (contact && b.save) {
      await prisma.contactEmailDraft.create({
        data: { contactId: contact.id, userId, templateType: b.kind, content: `Subject: ${draft.subjects[0] ?? ""}\n\n${draft.body}` },
      });
    }
    return NextResponse.json({ draft, to: contact?.email ?? null });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI request failed" }, { status: 502 });
  }
}
