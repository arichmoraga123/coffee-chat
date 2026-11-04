import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { getAnthropicApiKey } from "@/lib/anthropic";
import { draftToText, generateEmail } from "@/lib/email-ai";
import { ndjsonResponse, throttle } from "@/lib/ai-stream";

const partialText = (p: { subjects: string[]; body: string }) => (p.subjects[0] ? `Subject: ${p.subjects[0]}\n\n${p.body}` : p.body);

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
  const body = (await req.json().catch(() => ({}))) as { interactionId?: string; kind?: "thank-you" | "follow-up"; extra?: string };
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
      select: { id: true },
    }),
  ]);

  if (!contact || !interaction || !me) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return ndjsonResponse(async (send) => {
    const live = throttle((p: { subjects: string[]; body: string }) => send({ type: "partial", text: partialText(p) }));
    const history = await prisma.interaction.findMany({
      where: { userId, contactId, id: { not: interaction.id } },
      orderBy: { date: "desc" },
      take: 3,
    });
    // A call in the last week gets a thank-you; older ones get an update-style follow-up.
    const daysSince = (Date.now() - interaction.date.getTime()) / 86_400_000;
    const kind = body.kind ?? (daysSince <= 7 ? "thank-you" : "follow-up");
    const draft = await generateEmail({ userId, kind, contact, interaction, history, extra: body.extra, feature: "follow-up", onPartial: live.push });
    live.flush();
    return { text: draftToText(draft), draft, kind };
  });
}
