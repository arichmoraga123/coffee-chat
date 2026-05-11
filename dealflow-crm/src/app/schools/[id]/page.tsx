import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminUserId } from "@/lib/auth";
import { SchoolProfileView } from "@/components/school-profile-view";

export const dynamic = "force-dynamic";

export default async function SchoolProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireAdminUserId();
  const { id } = await params;

  const [me, school] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    }),
    prisma.school.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        shortName: true,
        location: true,
        type: true,
        domain: true,
        _count: { select: { members: true } },
      },
    }),
  ]);

  if (!school) notFound();

  const questionWhere = {
    OR: [{ schoolId: id }, { submitter: { schoolId: id } }],
  };

  const [
    questionsContributed,
    questions,
    alumni,
    timelines,
    compPreview,
    membersSample,
  ] = await Promise.all([
    prisma.question.count({ where: questionWhere }),
    prisma.question.findMany({
      where: questionWhere,
      take: 15,
      orderBy: [{ upvotes: "desc" }, { createdAt: "desc" }],
      select: { id: true, question: true, category: true, difficulty: true },
    }),
    prisma.schoolAlumni.findMany({
      where: { schoolId: id, verified: true },
      orderBy: [{ firmName: "asc" }, { role: "asc" }],
      take: 40,
      select: { id: true, firmName: true, role: true, vertical: true, gradYear: true },
    }),
    prisma.firmTimeline.findMany({
      where: { schoolId: id },
      orderBy: [{ year: "desc" }, { firmName: "asc" }],
      take: 25,
      select: {
        id: true,
        firmName: true,
        firmType: true,
        role: true,
        year: true,
        applicationOpen: true,
        applicationClose: true,
        firstRound: true,
        notes: true,
      },
    }),
    prisma.compData.findMany({
      where: { schoolId: id },
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
      take: 8,
      select: {
        id: true,
        firmName: true,
        role: true,
        vertical: true,
        officeLocation: true,
        baseComp: true,
        totalComp: true,
        year: true,
      },
    }),
    prisma.user.findMany({
      where: { schoolId: id },
      select: { careerTracks: true },
      take: 800,
    }),
  ]);

  const tally: Record<string, number> = {};
  for (const m of membersSample) {
    for (const t of m.careerTracks) {
      tally[t] = (tally[t] ?? 0) + 1;
    }
  }
  const topCareerTracks = Object.entries(tally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10) as [string, number][];

  const isUsersSchool = me?.schoolId === id;

  return (
    <SchoolProfileView
      schoolId={school.id}
      name={school.name}
      shortName={school.shortName}
      location={school.location}
      type={school.type}
      domain={school.domain}
      memberCount={school._count.members}
      questionsContributed={questionsContributed}
      topCareerTracks={topCareerTracks}
      questions={questions}
      alumni={alumni}
      timelines={timelines}
      compPreview={compPreview}
      isUsersSchool={isUsersSchool}
    />
  );
}
