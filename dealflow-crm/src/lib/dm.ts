import "server-only";
import { prisma } from "@/lib/prisma";
import { peBroadMembership } from "@/lib/club-social";

export const MAX_MESSAGE = 2000;
export const MESSAGES_PER_MINUTE = 30;

/** The conversation, if the user is in it. */
export async function conversationFor(userId: string, conversationId: string) {
  return prisma.conversation.findFirst({
    where: { id: conversationId, members: { some: { userId } } },
    select: {
      id: true,
      clubId: true,
      members: { select: { userId: true, lastReadAt: true, muted: true, blocked: true, user: { select: { id: true, name: true } } } },
    },
  });
}

/** Finds or creates the 1:1 conversation between two active PE@Broad members. */
export async function startConversation(userId: string, otherId: string): Promise<{ id: string } | { error: string }> {
  if (userId === otherId) return { error: "You can't message yourself." };
  const [me, them] = await Promise.all([peBroadMembership(userId), peBroadMembership(otherId)]);
  if (!me || !them || me.clubId !== them.clubId) return { error: "Messages are between PE@Broad members only." };
  const existing = await prisma.conversation.findFirst({
    where: { clubId: me.clubId, AND: [{ members: { some: { userId } } }, { members: { some: { userId: otherId } } }] },
    select: { id: true },
  });
  if (existing) return existing;
  return prisma.conversation.create({
    data: { clubId: me.clubId, members: { create: [{ userId }, { userId: otherId }] } },
    select: { id: true },
  });
}

/** Posts a message. Enforces membership, blocks, length, and the per-minute limit. */
export async function sendMessage(
  userId: string,
  conversationId: string,
  body: string,
  extra?: { kind?: "text" | "challenge"; challengeId?: string },
): Promise<{ ok: true; id: string } | { error: string; status: number }> {
  const text = body.trim();
  if (!text) return { error: "Message is empty.", status: 400 };
  if (text.length > MAX_MESSAGE) return { error: `Messages are limited to ${MAX_MESSAGE} characters.`, status: 400 };
  const conv = await conversationFor(userId, conversationId);
  if (!conv) return { error: "Conversation not found.", status: 404 };
  if (!(await peBroadMembership(userId))) return { error: "Messages are for active PE@Broad members.", status: 403 };
  if (conv.members.some((m) => m.blocked)) return { error: "This conversation is blocked.", status: 403 };
  const recent = await prisma.message.count({ where: { senderId: userId, createdAt: { gte: new Date(Date.now() - 60_000) } } });
  if (recent >= MESSAGES_PER_MINUTE) return { error: "You're sending messages too fast. Wait a minute.", status: 429 };
  const msg = await prisma.message.create({
    data: { conversationId, senderId: userId, body: text, kind: extra?.kind ?? "text", challengeId: extra?.challengeId },
    select: { id: true, createdAt: true },
  });
  await prisma.$transaction([
    prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: msg.createdAt } }),
    prisma.conversationMember.update({ where: { conversationId_userId: { conversationId, userId } }, data: { lastReadAt: msg.createdAt } }),
  ]);
  return { ok: true, id: msg.id };
}

export async function unreadCount(userId: string): Promise<number> {
  const rows = await prisma.conversationMember.findMany({
    where: { userId, muted: false, conversation: { messages: { some: {} } } },
    select: { conversationId: true, lastReadAt: true },
  });
  if (!rows.length) return 0;
  const counts = await Promise.all(
    rows.map((r) => prisma.message.count({ where: { conversationId: r.conversationId, senderId: { not: userId }, createdAt: { gt: r.lastReadAt } } })),
  );
  return counts.reduce((a, b) => a + b, 0);
}
