import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { allLessons } from "@/lib/learn/lessons";
import { getPeBroadClub } from "@/lib/club-roster";

type Hit = { type: "lesson" | "contact" | "firm" | "member"; id: string; title: string; subtitle?: string; href: string };

/** ⌘K search: lessons (title + deep-dive titles), the user's contacts and firms, and PE@Broad members. */
export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 80);
  if (q.length < 2) return NextResponse.json({ hits: [] });

  const hits: Hit[] = [];
  for (const l of allLessons()) {
    if (l.title.toLowerCase().includes(q)) {
      hits.push({ type: "lesson", id: l.id, title: l.title, subtitle: `Lesson ${l.id.replace("-", ".")} · ${l.moduleTitle}`, href: `/learn/${l.id}` });
      continue;
    }
    const dive = l.blocks.find((b) => b.type === "deepDive" && b.title.toLowerCase().includes(q));
    if (dive && dive.type === "deepDive") {
      hits.push({ type: "lesson", id: `${l.id}#${dive.id}`, title: dive.title, subtitle: `Go deeper · Lesson ${l.id.replace("-", ".")}`, href: `/learn/${l.id}#${dive.id}` });
    }
  }

  const club = await getPeBroadClub();
  const [contacts, firms, members] = await Promise.all([
    prisma.contact.findMany({
      where: { userId, OR: [{ fullName: { contains: q, mode: "insensitive" } }, { title: { contains: q, mode: "insensitive" } }] },
      select: { id: true, fullName: true, title: true },
      take: 8,
    }),
    prisma.firm.findMany({
      where: { userId, name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, location: true },
      take: 8,
    }),
    prisma.clubMember.findMany({
      where: { clubId: club.id, active: true, user: { name: { contains: q, mode: "insensitive" } } },
      select: { user: { select: { id: true, name: true } } },
      take: 8,
    }),
  ]);
  for (const c of contacts) hits.push({ type: "contact", id: c.id, title: c.fullName, subtitle: c.title, href: `/contacts/${c.id}` });
  for (const f of firms) hits.push({ type: "firm", id: f.id, title: f.name, subtitle: f.location, href: `/firms/${f.id}` });
  for (const m of members) hits.push({ type: "member", id: m.user.id, title: m.user.name, subtitle: "PE@Broad", href: `/club/members` });

  return NextResponse.json({ hits: hits.slice(0, 40) });
}
