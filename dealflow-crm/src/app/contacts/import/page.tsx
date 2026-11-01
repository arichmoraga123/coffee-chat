import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { ImportWizard } from "@/components/contacts/import-wizard";

export const metadata = { title: "Import contacts" };

export default async function ImportContactsPage() {
  await requireUserId();
  return (
    <div className="space-y-5">
      <PageHeader
        crumbs={[{ label: "Contacts", href: "/contacts" }, { label: "Import" }]}
        title="Import contacts"
        subtitle="Re-uploading is safe: people already here are updated, not duplicated, and interactions already imported are skipped."
        actions={
          <Link href="/contacts/imports" className="text-[13px] font-medium text-accent hover:underline">
            Import history
          </Link>
        }
      />
      <ImportWizard />
    </div>
  );
}
