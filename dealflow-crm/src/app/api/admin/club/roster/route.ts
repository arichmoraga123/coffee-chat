import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/admin-auth";
import {
  backfillRoster,
  getPeBroadClub,
  parseOutlookPaste,
  parseRosterCsv,
  upsertRoster,
} from "@/lib/club-roster";

/** Roster entries with whether each person has signed up, plus pending join requests. */
export async function GET() {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const club = await getPeBroadClub();
  const [entries, requests] = await Promise.all([
    prisma.clubRosterEntry.findMany({ where: { clubId: club.id }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    prisma.clubJoinRequest.findMany({
      where: { clubId: club.id, status: "pending" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, eduEmail: true, eduVerified: true } },
      },
    }),
  ]);
  const emails = entries.map((e) => e.email);
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { in: emails, mode: "insensitive" } },
        { eduVerified: true, eduEmail: { in: emails, mode: "insensitive" } },
      ],
    },
    select: { id: true, email: true, eduEmail: true, eduVerified: true, lastActiveAt: true, createdAt: true },
  });
  const byEmail = new Map<string, (typeof users)[number]>();
  for (const u of users) {
    byEmail.set(u.email.toLowerCase(), u);
    if (u.eduVerified && u.eduEmail) byEmail.set(u.eduEmail.toLowerCase(), u);
  }
  return NextResponse.json({
    clubId: club.id,
    entries: entries.map((e) => {
      const u = byEmail.get(e.email);
      return {
        id: e.id,
        email: e.email,
        name: e.name,
        role: e.role,
        active: e.active,
        addedAt: e.addedAt,
        signedUp: Boolean(u),
        lastActiveAt: u ? (u.lastActiveAt ?? u.createdAt) : null,
      };
    }),
    requests: requests.map(({ user: { id: userId, ...user }, ...r }) => ({ ...user, ...r, userId })),
  });
}

const RowSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().max(200).nullable().optional(),
  role: z.enum(["member", "officer", "admin"]).default("member"),
});
const PostSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("parse"), format: z.enum(["outlook", "csv"]), text: z.string().max(500_000) }),
  z.object({ action: z.literal("save"), rows: z.array(RowSchema).min(1).max(2000) }),
]);

/** parse → preview rows (nothing saved). save → upsert entries and link matching users. */
export async function POST(req: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const parsed = PostSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const body = parsed.data;

  if (body.action === "parse") {
    const result = body.format === "csv" ? parseRosterCsv(body.text) : { rows: parseOutlookPaste(body.text), errors: [] };
    const club = await getPeBroadClub();
    const existing = await prisma.clubRosterEntry.findMany({
      where: { clubId: club.id, email: { in: result.rows.map((r) => r.email) } },
      select: { email: true, active: true, role: true },
    });
    const ex = new Map(existing.map((e) => [e.email, e]));
    return NextResponse.json({
      rows: result.rows.map((r) => {
        const e = ex.get(r.email);
        // Outlook pastes carry no role, so people already on the roster keep theirs.
        const role = e && body.format === "outlook" ? e.role : r.role;
        return { ...r, role, status: !e ? "new" : e.active ? "existing" : "reactivate" };
      }),
      errors: result.errors,
    });
  }

  const club = await getPeBroadClub();
  const result = await upsertRoster(
    club.id,
    body.rows.map((r) => ({ email: r.email, name: r.name ?? null, role: r.role })),
  );
  return NextResponse.json(result);
}

const PatchSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["member", "officer", "admin"]).optional(),
  active: z.boolean().optional(),
  name: z.string().trim().max(200).nullable().optional(),
});

/** Change role, rename, or (de)activate one entry. Deactivating keeps the user's data. */
export async function PATCH(req: Request) {
  const auth = await requireAdminSession();
  if ("error" in auth) return auth.error;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { id, ...data } = parsed.data;
  const entry = await prisma.clubRosterEntry.update({ where: { id }, data }).catch(() => null);
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await backfillRoster([entry.email]);
  return NextResponse.json({ ok: true });
}
