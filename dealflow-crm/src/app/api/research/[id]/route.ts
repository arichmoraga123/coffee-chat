import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const firm = await prisma.firmResearch.findUnique({ where: { id } });
  if (!firm) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const deals = await prisma.deal.findMany({
    where: {
      OR: [
        { acquirer: { contains: firm.firmName, mode: "insensitive" } },
        { target: { contains: firm.firmName, mode: "insensitive" } },
        { title: { contains: firm.firmName, mode: "insensitive" } },
      ],
    },
    orderBy: { announcedAt: "desc" },
    take: 12,
  });
  return NextResponse.json({ firm, relatedDeals: deals });
}

/** Any logged-in user may edit (wiki). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json()) as Record<string, unknown>;
  const existing = await prisma.firmResearch.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const data: Record<string, unknown> = { lastUpdated: new Date(), updatedById: userId };
  const str = (k: string) => (body[k] !== undefined ? String(body[k]).trim() : undefined);
  const arr = (k: string) => (Array.isArray(body[k]) ? (body[k] as string[]) : undefined);
  if (body.firmType !== undefined) data.firmType = str("firmType");
  if (body.aum !== undefined) data.aum = str("aum") || null;
  if (body.founded !== undefined) data.founded = body.founded ? Number(body.founded) : null;
  if (body.headquarters !== undefined) data.headquarters = str("headquarters") || null;
  if (body.description !== undefined) data.description = str("description") || null;
  if (body.investmentFocus !== undefined) data.investmentFocus = str("investmentFocus") || null;
  if (body.dealSize !== undefined) data.dealSize = str("dealSize") || null;
  if (body.notableDeals !== undefined) data.notableDeals = arr("notableDeals") ?? [];
  if (body.whatTheyLookFor !== undefined) data.whatTheyLookFor = str("whatTheyLookFor") || null;
  if (body.hiringTimeline !== undefined) data.hiringTimeline = str("hiringTimeline") || null;
  if (body.interviewProcess !== undefined) data.interviewProcess = str("interviewProcess") || null;
  if (body.culture !== undefined) data.culture = str("culture") || null;
  if (body.msuAlumni !== undefined) data.msuAlumni = arr("msuAlumni") ?? [];
  if (body.websiteUrl !== undefined) data.websiteUrl = str("websiteUrl") || null;
  if (body.linkedinUrl !== undefined) data.linkedinUrl = str("linkedinUrl") || null;
  const firm = await prisma.firmResearch.update({ where: { id }, data: data as never });
  return NextResponse.json(firm);
}
