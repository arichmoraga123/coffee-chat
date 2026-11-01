import { requireUserId } from "@/lib/auth";
import { contactListRows } from "@/lib/contacts-list";
import { PageHeader } from "@/components/ui/page-header";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { ContactsTabs } from "@/components/contacts/contacts-tabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Trash" };

export default async function TrashPage() {
  const userId = await requireUserId();
  const rows = await contactListRows(userId, "trash");
  return (
    <div className="space-y-5">
      <PageHeader crumbs={[{ label: "Contacts", href: "/contacts" }, { label: "Trash" }]} title="Trash" subtitle="Deleted contacts stay here for 30 days, then they're removed for good." />
      <ContactsTabs active="trash" counts={{ trash: rows.length }} />
      <ContactsTable rows={rows} view="trash" firms={[]} />
    </div>
  );
}
