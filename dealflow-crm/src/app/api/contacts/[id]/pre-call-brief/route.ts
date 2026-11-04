import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { anthropicMessageWithProgress, getAnthropicApiKey } from "@/lib/anthropic";
import { ndjsonResponse, throttle } from "@/lib/ai-stream";
import { contactProfileBlock, interactionBlock } from "@/lib/contact-profile";
import { firmDealsBlock, senderBlock } from "@/lib/email-ai";

const BRIEF_STYLE = `You prepare one-page briefs that a college student reads in the 2 minutes before a networking call with a banker or investor.
Rules:
- Use ONLY facts in the context. Never invent details about the person, their deals, or shared experiences. If something is unknown, say "Not in your notes" and suggest how to find it (LinkedIn, firm website).
- Be concrete and skimmable: short bullets, no filler, no generic advice like "be yourself".
- Questions must be specific to this person's path, group, or firm, and not answerable by a quick Google search.
- Write in second person to the student ("Ask about…", "Mention…").`;

/** The pre-call one-pager: who they are, their firm, common ground, a tailored intro, smart questions, what you owe them. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!getAnthropicApiKey()) {
    return NextResponse.json({ error: "AI is not configured (ANTHROPIC_API_KEY)." }, { status: 503 });
  }

  const { id: contactId } = await params;
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, userId },
    include: { firm: true, interactions: { orderBy: { date: "desc" }, take: 6 } },
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [sender, deals] = await Promise.all([senderBlock(userId), firmDealsBlock(contact.firm.name)]);
  const f = contact.firm;
  const firmBlock = [
    `Name: ${f.name}`,
    f.type ? `Type: ${f.type}` : null,
    f.location ? `Location: ${f.location}` : null,
    f.aum ? `AUM: ${f.aum}` : null,
    f.focus ? `Focus: ${f.focus}` : null,
    f.recruitingNotes ? `Your recruiting notes: ${f.recruitingNotes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const history = contact.interactions.map((i) => interactionBlock(i)).join("\n---\n");

  const prompt = [
    "Write the pre-call one-pager in Markdown with exactly these sections and nothing else:",
    `# ${contact.fullName} · ${contact.title}, ${f.name}`,
    "One line: the single most useful thing to remember walking in.",
    "## Their path",
    "- 2–4 bullets: school → prior roles → current group, as a timeline. Flag anything notable (lateral move, switch from banking to PE).",
    "## Their firm and group",
    "- 2–4 bullets: what the firm/group does, size, and any recent deal from the list below worth mentioning (name it and give one sentence on why it's interesting). If no deals are listed, say so.",
    "## Common ground",
    "- Real overlaps between the student and this person (school, hometown, clubs, sports, prior firms, track). Only list overlaps supported by both profiles; if none, say 'None found — lead with genuine interest in their path'.",
    "## Your 30-second intro for this call",
    "- A tailored version of the student's 'tell me about yourself' (3–4 sentences, first person) that bridges to why this person/firm.",
    "## Questions to ask",
    "- 5 specific questions in priority order. Avoid comp, hours, and anything on the firm's website.",
    "## Avoid",
    "- 2–3 short pitfalls specific to this call (e.g., don't ask for a referral on a first call; don't claim deal knowledge you don't have).",
    "## Owed from last time",
    "- Action items or promises from past interactions, or 'Nothing logged'.",
    "## After the call",
    "- Send a thank-you within 24 hours (use Draft follow-up), log what they said, and set a reminder for the next touchpoint.",
    "",
    "STUDENT:",
    sender.text,
    "",
    "CONTACT:",
    contactProfileBlock(contact),
    "",
    "FIRM:",
    firmBlock,
    deals ? `\nRECENT DEALS MENTIONING THE FIRM:\n${deals}` : "\nRECENT DEALS MENTIONING THE FIRM: none in the app's deal feed.",
    "",
    "PAST INTERACTIONS (newest first):",
    history || "(none logged yet)",
  ].join("\n");

  // Streams the brief as it's written. Low effort: it summarizes facts we already pass in, so deep thinking only adds wait.
  return ndjsonResponse(async (send) => {
    const live = throttle((text: string) => send({ type: "partial", text }));
    const text = await anthropicMessageWithProgress(
      prompt,
      { system: BRIEF_STYLE, cacheSystem: true, maxTokens: 1800, effort: "low", usageLog: { userId, feature: "pre-call" } },
      live.push,
    );
    live.flush();
    return { text };
  });
}
