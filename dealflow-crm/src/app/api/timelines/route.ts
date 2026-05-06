import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromSession } from "@/lib/auth";

export async function GET(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const firmType = searchParams.get("firmType");
  const role = searchParams.get("role");
  const year = searchParams.get("year");

  const where: Record<string, unknown> = {};
  if (firmType && firmType !== "all") where.firmType = firmType;
  if (role && role !== "all") where.role = role;
  if (year && year !== "all") {
    const y = Number(year);
    if (Number.isFinite(y)) where.year = y;
  }

  const timelines = await prisma.firmTimeline.findMany({
    where,
    orderBy: [{ upvotes: "desc" }, { firmName: "asc" }],
    include: {
      votes: { where: { userId }, select: { id: true } },
    },
  });

  return NextResponse.json({
    timelines: timelines.map((t) => ({
      id: t.id,
      firmName: t.firmName,
      firmType: t.firmType,
      role: t.role,
      applicationOpen: t.applicationOpen?.toISOString() ?? null,
      applicationClose: t.applicationClose?.toISOString() ?? null,
      firstRound: t.firstRound?.toISOString() ?? null,
      finalRound: t.finalRound?.toISOString() ?? null,
      offerDate: t.offerDate?.toISOString() ?? null,
      year: t.year,
      notes: t.notes,
      verified: t.verified,
      upvotes: t.upvotes,
      hasVoted: t.votes.length > 0,
      careerTracks: t.careerTracks ?? [],
    })),
  });
}

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const firmName = String(body.firmName ?? "").trim();
  const firmType = String(body.firmType ?? "").trim();
  const role = String(body.role ?? "").trim();
  const year = Number(body.year);
  if (!firmName || !firmType || !role || !Number.isFinite(year)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const parseDate = (v: unknown) => {
    if (!v) return null;
    const d = new Date(String(v));
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const inferTracks = (): string[] => {
    if (firmType === "CONSULTING") return ["Consulting"];
    if (firmType === "ACCOUNTING") return ["Big 4 Accounting"];
    if (firmType === "PE") return ["Private Equity"];
    if (firmType === "VC") return ["Venture Capital"];
    if (firmType === "BB" || firmType === "EB" || firmType === "MM") return ["Investment Banking"];
    return [];
  };

  const created = await prisma.firmTimeline.create({
    data: {
      firmName,
      firmType,
      role,
      year,
      notes: body.notes ? String(body.notes) : null,
      applicationOpen: parseDate(body.applicationOpen),
      applicationClose: parseDate(body.applicationClose),
      firstRound: parseDate(body.firstRound),
      finalRound: parseDate(body.finalRound),
      offerDate: parseDate(body.offerDate),
      submittedBy: userId,
      verified: false,
      careerTracks: inferTracks(),
    },
  });
  return NextResponse.json(created, { status: 201 });
}
