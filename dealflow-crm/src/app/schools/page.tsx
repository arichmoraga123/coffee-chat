import { prisma } from "@/lib/prisma";
import { requireAdminUserId } from "@/lib/auth";
import { SchoolsSearch, type SchoolCard } from "@/components/schools-search";

export const dynamic = "force-dynamic";

export default async function SchoolsPage() {
  await requireAdminUserId();

  const schools = await prisma.school.findMany({
    where: { isVerified: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      shortName: true,
      type: true,
      location: true,
      _count: { select: { members: true } },
    },
  });

  const cards: SchoolCard[] = await Promise.all(
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

  return <SchoolsSearch schools={cards} />;
}
