import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { anthropicMessage, getAnthropicApiKey } from "@/lib/anthropic";
import { contactProfileBlock, interactionBlock } from "@/lib/contact-profile";

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
  const body = (await req.json().catch(() => ({}))) as { interactionId?: string };
  const interactionId = String(body.interactionId ?? "");
  if (!interactionId) {
    return NextResponse.json({ error: "interactionId is required" }, { status: 400 });
  }

  const [contact, interaction, me] = await Promise.all([
    prisma.contact.findFirst({
      where: { id: contactId, userId },
      include: { firm: true },
    }),
    prisma.interaction.findFirst({
      where: { id: interactionId, userId, contactId },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        recruitingTarget: true,
        targetFirms: true,
        dailyGoal: true,
      },
    }),
  ]);

  if (!contact || !interaction || !me) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userBlock = [
    `Name: ${me.name}`,
    me.recruitingTarget.length ? `Recruiting goals (targets): ${me.recruitingTarget.join(", ")}` : null,
    me.targetFirms.length ? `Target firms: ${me.targetFirms.join(", ")}` : null,
    `Daily question goal: ${me.dailyGoal}`,
    "(School/clubs for the user are not stored in the app yet.)",
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = [
    `Draft a personalized follow-up email from ${me.name} to ${contact.fullName} after their ${interaction.type} on ${interaction.date.toISOString().slice(0, 10)}.`,
    "",
    "Contact profile:",
    contactProfileBlock(contact),
    "",
    "User (sender) context:",
    userBlock,
    "",
    "This interaction:",
    interactionBlock(interaction),
    "",
    `Instructions: Draft a personalized follow-up email from ${me.name} to ${contact.fullName} after their ${interaction.type} on ${interaction.date.toISOString().slice(0, 10)}. Reference specific things discussed. Be warm but professional. Under 150 words. Include specific callbacks to what was discussed and any action items.`,
  ].join("\n");

  try {
    const text = await anthropicMessage(prompt, {
      usageLog: { userId, feature: "follow-up" },
    });
    return NextResponse.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
