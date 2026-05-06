import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const schools = await prisma.school.findMany({
    where: { isVerified: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      shortName: true,
      type: true,
      location: true,
      country: true,
      domain: true,
      _count: { select: { members: true } },
    },
  });

  const list = await Promise.all(
    schools.map(async ({ _count, ...s }) => {
      const questionsContributed = await prisma.question.count({
        where: { OR: [{ schoolId: s.id }, { submitter: { schoolId: s.id } }] },
      });
      return {
        ...s,
        memberCount: _count.members,
        questionsContributed,
      };
    }),
  );

  return NextResponse.json({ schools: list });
}
