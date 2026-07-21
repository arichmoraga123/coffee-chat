import { prisma } from "@/lib/prisma";
import { ContactsView } from "@/components/contacts-view";
import { requireUserId } from "@/lib/auth";
import { getFollowUpStatus } from "@/lib/follow-up";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; filter?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const [contacts, firms, user] = await Promise.all([
    prisma.contact.findMany({
      where: { userId },
      include: {
        firm: true,
        interactions: { orderBy: { date: "desc" }, take: 1 },
      },
      orderBy: { lastInteractionDate: "desc" },
    }),
    prisma.firm.findMany({ where: { userId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { school: { select: { name: true, shortName: true } } },
    }),
  ]);

  const schoolName = user?.school?.name ?? "Michigan State";

  return (
    <ContactsView
      initialTab={params.tab ?? "all"}
      importFilter={params.filter === "imported"}
      schoolName={schoolName}
      firms={firms}
      initialContacts={contacts.map((c) => ({
        id: c.id,
        fullName: c.fullName,
        email: c.email,
        linkedinUrl: c.linkedinUrl,
        firmName: c.firm.name,
        firmType: c.firm.type,
        firmId: c.firmId,
        group: c.group,
        title: c.title,
        relationshipStrength: c.relationshipStrength,
        referralProbability: c.referralProbability,
        recruitingCategory: c.recruitingCategory,
        lastInteractionDate: (c.lastInteractionDate ?? c.interactions[0]?.date)?.toISOString() ?? null,
        followUpStatus: getFollowUpStatus(c.lastInteractionDate ?? c.interactions[0]?.date ?? null),
        warmthScore: c.warmthScore,
        source: c.source,
        inOutreachQueue: c.inOutreachQueue,
        queueExcluded: c.queueExcluded,
        createdAt: c.createdAt.toISOString(),
      }))}
    />
  );
}
