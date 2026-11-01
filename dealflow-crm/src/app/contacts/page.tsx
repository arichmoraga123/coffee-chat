import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { contactListRows } from "@/lib/contacts-list";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { ContactsTabs } from "@/components/contacts/contacts-tabs";
import { OutreachTracker } from "@/components/contacts/outreach-tracker";
import { FindContactsButton } from "@/components/contacts/find-contacts-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contacts" };

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ view?: string; tab?: string }> }) {
  const userId = await requireUserId();
  const sp = await searchParams;
  const view = sp.view === "network" ? "network" : sp.view === "queue" || sp.tab === "queue" ? "queue" : "active";
  const [counts, firms, me] = await Promise.all([
    prisma.contact.groupBy({ by: ["list"], where: { userId, deletedAt: null }, _count: { _all: true } }),
    prisma.firm.findMany({ where: { userId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findUnique({ where: { id: userId }, select: { school: { select: { name: true } } } }),
  ]);
  const school = me?.school?.name ?? "Michigan State";
  const n = (l: string) => counts.find((c) => c.list === l)?._count._all ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contacts"
        subtitle="Everyone you're actively working. Network holds connections you're not reaching out to yet."
        actions={
          <>
            <Button variant="secondary" asChild>
              <Link href="/contacts/import">Import</Link>
            </Button>
            <FindContactsButton schoolName={school} />
          </>
        }
      />
      <ContactsTabs active={view} counts={{ active: n("active"), network: n("network") }} />
      {view === "queue" ? (
        <OutreachTracker userId={userId} />
      ) : (
        <ContactsTable rows={await contactListRows(userId, view)} view={view} firms={firms} />
      )}
    </div>
  );
}
