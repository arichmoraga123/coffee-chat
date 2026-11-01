import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

/** Inbox: each conversation with the other person, the last message, and unread count. */
export async function GET() {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.conversationMember.findMany({
    where: { userId },
    orderBy: { conversation: { lastMessageAt: "desc" } },
    select: {
      lastReadAt: true,
      muted: true,
      blocked: true,
      conversation: {
        select: {
          id: true,
          lastMessageAt: true,
          members: { where: { userId: { not: userId } }, select: { blocked: true, user: { select: { id: true, name: true } } } },
          messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, senderId: true, kind: true, createdAt: true } },
        },
      },
    },
  });
  const conversations = await Promise.all(
    rows.map(async (r) => ({
      id: r.conversation.id,
      other: r.conversation.members[0]?.user ?? null,
      last: r.conversation.messages[0] ?? null,
      lastMessageAt: r.conversation.lastMessageAt,
      muted: r.muted,
      blocked: r.blocked || Boolean(r.conversation.members[0]?.blocked),
      unread: await prisma.message.count({ where: { conversationId: r.conversation.id, senderId: { not: userId }, createdAt: { gt: r.lastReadAt } } }),
    })),
  );
  return NextResponse.json({ conversations: conversations.filter((c) => c.other) });
}
