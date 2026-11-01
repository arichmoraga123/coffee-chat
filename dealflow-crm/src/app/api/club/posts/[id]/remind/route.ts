import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { TYPE_LABEL, audienceUserIds, canPost, parseAudience, type PostType } from "@/lib/club-publish";
import { notifyMany } from "@/lib/notify";

/** Officers: nudge members in the audience who haven't opened the post (or haven't marked it done). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const post = await prisma.clubPost.findUnique({ where: { id }, include: { progress: true } });
  if (!post || !(await canPost(userId, post.clubId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { who } = (await req.json().catch(() => ({}))) as { who?: "unopened" | "notdone" };
  const audience = (await audienceUserIds(post.clubId, parseAudience(post.audience))).filter((u) => u !== post.authorId);
  const opened = new Set(post.progress.filter((p) => p.viewedAt).map((p) => p.userId));
  const done = new Set(post.progress.filter((p) => p.doneAt).map((p) => p.userId));
  const targets = audience.filter((u) => (who === "notdone" ? !done.has(u) : !opened.has(u)));
  const label = TYPE_LABEL[post.type as PostType] ?? "Post";
  await notifyMany(targets, "club_post", {
    title: `Reminder: ${label.toLowerCase()} "${post.title}"`,
    body: post.dueDate ? `Due ${post.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}.` : "Take a look when you get a chance.",
    url: `/club/content/${post.id}`,
  });
  return NextResponse.json({ count: targets.length });
}
