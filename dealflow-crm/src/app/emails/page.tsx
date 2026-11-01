import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { EmailWriter } from "@/components/emails/email-writer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email writer" };

export default async function EmailsPage({ searchParams }: { searchParams: Promise<{ contact?: string; kind?: string; template?: string }> }) {
  const userId = await requireUserId();
  const sp = await searchParams;
  const [contacts, me] = await Promise.all([
    prisma.contact.findMany({
      where: { userId },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, title: true, firm: { select: { name: true } } },
      take: 1000,
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, classYear: true, careerTracks: true, school: { select: { shortName: true, name: true } }, clubMemberships: { where: { active: true }, select: { club: { select: { name: true } } }, take: 1 } } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Email writer"
        subtitle="Cold emails, thank-yous, bumps, and referral asks that sound like you and use real details. Start from a template or a saved contact."
      />
      <EmailWriter
        contacts={contacts.map((c) => ({ id: c.id, label: `${c.fullName} · ${c.firm.name}${c.title ? `, ${c.title}` : ""}` }))}
        me={{
          name: me?.name ?? "",
          school: me?.school?.shortName ?? me?.school?.name ?? "MSU",
          classYear: me?.classYear ?? null,
          track: me?.careerTracks[0] ?? "investment banking",
          club: me?.clubMemberships[0]?.club.name ?? null,
        }}
        initial={{ contactId: sp.contact ?? "", kind: sp.kind ?? "", templateId: sp.template ?? "" }}
      />
    </div>
  );
}
