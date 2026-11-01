import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, Td, Th } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { ContactsTabs } from "@/components/contacts/contacts-tabs";
import { UndoImportButton } from "@/components/contacts/undo-import-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Imports" };

const SOURCE: Record<string, string> = { rolodex_template: "Rolodex file", linkedin: "LinkedIn connections", csv: "CSV" };

export default async function ImportsPage() {
  const userId = await requireUserId();
  const batches = await prisma.importBatch.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div className="space-y-5">
      <PageHeader
        crumbs={[{ label: "Contacts", href: "/contacts" }, { label: "Imports" }]}
        title="Imports"
        subtitle="Every upload, with what it added. Undo removes only what that import created."
        actions={
          <Button variant="primary" asChild>
            <Link href="/contacts/import">New import</Link>
          </Button>
        }
      />
      <ContactsTabs active="imports" />
      {batches.length ? (
        <DataTable minWidth={760}>
          <thead>
            <tr>
              <Th>File</Th>
              <Th>Source</Th>
              <Th>Date</Th>
              <Th className="text-right">New</Th>
              <Th className="text-right">Updated</Th>
              <Th className="text-right">Interactions</Th>
              <Th className="text-right">Tasks</Th>
              <Th className="w-44" />
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => {
              const c = b.counts as Record<string, number>;
              return (
                <tr key={b.id}>
                  <Td className="max-w-56 truncate">{b.fileName}</Td>
                  <Td className="text-ink-2">{SOURCE[b.source] ?? b.source}</Td>
                  <Td className="text-ink-2">{b.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Td>
                  <Td className="text-right">{c.contactsNew ?? 0}</Td>
                  <Td className="text-right">{c.contactsUpdated ?? 0}</Td>
                  <Td className="text-right">{c.interactions ?? 0}</Td>
                  <Td className="text-right">{c.tasks ?? 0}</Td>
                  <Td className="text-right">{b.status === "undone" ? <Badge>Undone</Badge> : <UndoImportButton id={b.id} label={b.fileName} />}</Td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      ) : (
        <p className="text-sm text-ink-3">No imports yet.</p>
      )}
    </div>
  );
}
