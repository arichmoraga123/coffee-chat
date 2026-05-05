import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ContactDetailView } from "@/components/contact-detail-view";
import { requireUserId } from "@/lib/auth";
import type { ContactProfilePayload } from "@/components/contact-profile-form";
import type { TimelineInteraction } from "@/components/contact-interaction-timeline";

export const dynamic = "force-dynamic";

function toProfile(contact: {
  id: string;
  firmId: string;
  firm: { name: string; type: string | null };
  fullName: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  group: string;
  title: string;
  location: string;
  school: string;
  recruitingCategory: string;
  relationshipStrength: number;
  referralProbability: string;
  notes: string;
  lastInteractionDate: Date | null;
  undergradSchool: string | null;
  gradSchool: string | null;
  graduationYear: number | null;
  hometown: string | null;
  previousFirms: string[];
  careerPath: string | null;
  clubs: string[];
  sports: string[];
  greekLife: string | null;
  howWeMet: string | null;
  referredBy: string | null;
  mutualConnections: string[];
  warmthScore: string;
  hiringTimeline: string | null;
  whatTheyLookFor: string | null;
  referralPotential: string | null;
  openRoles: string | null;
  notableDeals: string[];
}): ContactProfilePayload {
  return {
    id: contact.id,
    firmId: contact.firmId,
    firmName: contact.firm.name,
    firmType: contact.firm.type,
    fullName: contact.fullName,
    email: contact.email,
    phone: contact.phone,
    linkedinUrl: contact.linkedinUrl,
    group: contact.group,
    title: contact.title,
    location: contact.location,
    school: contact.school,
    recruitingCategory: contact.recruitingCategory,
    relationshipStrength: contact.relationshipStrength,
    referralProbability: contact.referralProbability,
    notes: contact.notes,
    lastInteractionDate: contact.lastInteractionDate?.toISOString() ?? null,
    undergradSchool: contact.undergradSchool,
    gradSchool: contact.gradSchool,
    graduationYear: contact.graduationYear,
    hometown: contact.hometown,
    previousFirms: contact.previousFirms,
    careerPath: contact.careerPath,
    clubs: contact.clubs,
    sports: contact.sports,
    greekLife: contact.greekLife,
    howWeMet: contact.howWeMet,
    referredBy: contact.referredBy,
    mutualConnections: contact.mutualConnections,
    warmthScore: contact.warmthScore,
    hiringTimeline: contact.hiringTimeline,
    whatTheyLookFor: contact.whatTheyLookFor,
    referralPotential: contact.referralPotential,
    openRoles: contact.openRoles,
    notableDeals: contact.notableDeals,
  };
}

function toTimeline(
  interactions: Array<{
    id: string;
    date: Date;
    type: string;
    notes: string | null;
    adviceGiven: string | null;
    actionItems: string[];
    actionItemsChecked: number[];
    personalDetails: string | null;
    firmInsights: string | null;
    redFlags: string | null;
  }>,
): TimelineInteraction[] {
  return interactions.map((i) => ({
    id: i.id,
    date: i.date.toISOString(),
    type: i.type,
    notes: i.notes,
    adviceGiven: i.adviceGiven,
    actionItems: i.actionItems,
    actionItemsChecked: i.actionItemsChecked,
    personalDetails: i.personalDetails,
    firmInsights: i.firmInsights,
    redFlags: i.redFlags,
  }));
}

export default async function ContactDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();
  const [contact, firms, allOpportunities] = await Promise.all([
    prisma.contact.findFirst({
      where: { id, userId },
      include: {
        firm: true,
        interactions: { orderBy: { date: "desc" } },
        tasks: { orderBy: { dueDate: "asc" } },
        opportunities: { include: { opportunity: { include: { firm: true } } } },
      },
    }),
    prisma.firm.findMany({
      where: { userId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.opportunity.findMany({
      where: { userId },
      include: { firm: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!contact) return notFound();

  const linkedIds = new Set(contact.opportunities.map((oc) => oc.opportunityId));

  return (
    <ContactDetailView
      profile={toProfile(contact)}
      firms={firms}
      interactions={toTimeline(contact.interactions)}
      tasks={contact.tasks.map((t) => ({
        id: t.id,
        taskType: t.taskType,
        dueDate: t.dueDate.toISOString(),
        status: t.status,
      }))}
      opportunities={contact.opportunities.map((oc) => ({
        id: oc.opportunityId,
        label: `${oc.opportunity.firm.name} - ${oc.opportunity.role} (${oc.opportunity.stage})`,
      }))}
      linkableOpportunities={allOpportunities
        .filter((o) => !linkedIds.has(o.id))
        .map((o) => ({
          id: o.id,
          label: `${o.firm.name} - ${o.role} (${o.stage})`,
        }))}
    />
  );
}
