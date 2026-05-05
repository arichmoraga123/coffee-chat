import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { anthropicMessage, getAnthropicApiKey } from "@/lib/anthropic";
import { contactProfileBlock, interactionBlock } from "@/lib/contact-profile";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getAnthropicApiKey()) {
    return NextResponse.json({ error: "AI is not configured (ANTHROPIC_API_KEY)." }, { status: 503 });
  }

  const { id: contactId } = await params;

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId },
    include: {
      firm: true,
      interactions: { orderBy: { date: "desc" } },
    },
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const history = contact.interactions.map((i) => interactionBlock(i)).join("\n---\n");

  const prompt = [
    `You are helping ${contact.fullName}'s networking contact prepare for a call.`,
    "",
    "Contact profile:",
    contactProfileBlock(contact),
    "",
    "Past interactions (newest first):",
    history || "(No logged interactions yet.)",
    "",
    "Produce a brief the user can read in under 2 minutes. Use clear Markdown with these sections:",
    "## Summary",
    "- Exactly 3 bullets summarizing what we know about them.",
    "## Talking points",
    "- Exactly 5 suggested talking points from their background/clubs.",
    "## Questions for them",
    "- Exactly 3 questions about their firm/recruiting.",
    "## Follow-ups from last touch",
    "- Action items from the most recent interaction (or say none if missing).",
    "## Personal hooks",
    "- Personal details to reference (hometown, hobbies, etc.) from profile and notes.",
  ].join("\n");

  try {
    const text = await anthropicMessage(prompt, {
      usageLog: { userId, feature: "pre-call" },
    });
    return NextResponse.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
