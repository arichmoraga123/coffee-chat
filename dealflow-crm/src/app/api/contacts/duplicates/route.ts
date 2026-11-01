import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";
import { normalizeFirmName, normalizeLinkedIn } from "@/lib/contact-match";

/** "Looks like Maya Chen at Halvorsen & Pike already exists" — email, LinkedIn URL, or name + firm. */
export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sp = new URL(req.url).searchParams;
  const email = (sp.get("email") ?? "").trim().toLowerCase();
  const linkedin = normalizeLinkedIn(sp.get("linkedin") ?? "");
  const name = (sp.get("name") ?? "").trim().toLowerCase();
  const firm = normalizeFirmName(sp.get("firm") ?? "");
  const candidates = await prisma.contact.findMany({
    where: {
      userId,
      deletedAt: null,
      OR: [
        ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : []),
        ...(linkedin ? [{ linkedinUrl: { contains: linkedin.replace(/^https?:\/\/(www\.)?/, ""), mode: "insensitive" as const } }] : []),
        ...(name ? [{ fullName: { equals: name, mode: "insensitive" as const } }] : []),
      ],
    },
    select: { id: true, fullName: true, email: true, linkedinUrl: true, firm: { select: { name: true } } },
    take: 10,
  });
  const match = candidates.find(
    (c) =>
      (email && c.email.toLowerCase() === email) ||
      (linkedin && c.linkedinUrl && normalizeLinkedIn(c.linkedinUrl) === linkedin) ||
      (name && c.fullName.toLowerCase() === name && (!firm || normalizeFirmName(c.firm.name) === firm)),
  );
  return NextResponse.json({ duplicate: match ? { id: match.id, fullName: match.fullName, firm: match.firm.name } : null });
}
