import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { peBroadMembership } from "@/lib/club-social";

type Result = { value: string; label: string; sublabel?: string };

/**
 * Search-as-you-type for large lists (SearchSelect `endpoint`). Ranked with pg_trgm similarity plus a
 * prefix boost; scoped to the user's own data (or to the club for members). ≤ 20 results.
 * Empty query → most recently touched first.
 */
export async function GET(req: Request, ctx: { params: Promise<{ entity: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { entity } = await ctx.params;
  const sp = new URL(req.url).searchParams;
  const q = (sp.get("q") ?? "").trim().slice(0, 80);
  const firmId = sp.get("firmId");
  const like = `%${q}%`;
  const prefix = `${q}%`;
  let results: Result[] = [];

  if (entity === "firms") {
    const rows = q
      ? await prisma.$queryRaw<{ id: string; name: string; location: string }[]>(Prisma.sql`
          SELECT id, name, location FROM "Firm"
          WHERE "userId" = ${userId} AND (name ILIKE ${like} OR similarity(name, ${q}) > 0.2)
          ORDER BY (name ILIKE ${prefix})::int DESC, similarity(name, ${q}) DESC, name ASC
          LIMIT 20`)
      : await prisma.firm.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, name: true, location: true } });
    results = rows.map((f) => ({ value: f.id, label: f.name, sublabel: f.location || undefined }));
  } else if (entity === "contacts") {
    const firmFirst = firmId ? Prisma.sql`("firmId" = ${firmId})::int DESC,` : Prisma.empty;
    const rows = q
      ? await prisma.$queryRaw<{ id: string; fullName: string; title: string; firm: string }[]>(Prisma.sql`
          SELECT c.id, c."fullName", c.title, f.name AS firm FROM "Contact" c JOIN "Firm" f ON f.id = c."firmId"
          WHERE c."userId" = ${userId} AND c."deletedAt" IS NULL
            AND (c."fullName" ILIKE ${like} OR c.email ILIKE ${like} OR c.title ILIKE ${like} OR f.name ILIKE ${like}
                 OR similarity(c."fullName", ${q}) > 0.2)
          ORDER BY ${firmFirst} (c."fullName" ILIKE ${prefix})::int DESC, similarity(c."fullName", ${q}) DESC, c."fullName" ASC
          LIMIT 20`)
      : (
          await prisma.contact.findMany({
            where: { userId, deletedAt: null },
            orderBy: [{ updatedAt: "desc" }],
            take: 60,
            select: { id: true, fullName: true, title: true, firmId: true, firm: { select: { name: true } } },
          })
        )
          .sort((a, b) => Number(b.firmId === firmId) - Number(a.firmId === firmId))
          .slice(0, 20)
          .map((c) => ({ id: c.id, fullName: c.fullName, title: c.title, firm: c.firm.name }));
    results = rows.map((c) => ({ value: c.id, label: c.fullName, sublabel: [c.title, c.firm].filter(Boolean).join(" · ") }));
  } else if (entity === "members") {
    const m = await peBroadMembership(userId);
    if (!m) return NextResponse.json({ results: [] });
    const rows = await prisma.clubMember.findMany({
      where: { clubId: m.clubId, active: true, user: { deletedAt: null, ...(q ? { name: { contains: q, mode: "insensitive" } } : {}) } },
      select: { user: { select: { id: true, name: true, careerTracks: true } } },
      orderBy: { user: { name: "asc" } },
      take: 20,
    });
    results = rows.map((r) => ({ value: r.user.id, label: r.user.name, sublabel: r.user.careerTracks.join(" / ") || undefined }));
  } else {
    return NextResponse.json({ error: "Unknown list" }, { status: 404 });
  }
  return NextResponse.json({ results });
}
