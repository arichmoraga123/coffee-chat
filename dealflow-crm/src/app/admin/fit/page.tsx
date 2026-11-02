import { requireAdminUserId } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page-header";
import { FitAdmin } from "@/components/admin/fit-admin";
import { getFitData, getGroupFinderData } from "@/lib/fit-content";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Fit content" };

/** F4: edit fit questions, group profiles and the Group Finder weights (stored in the database, seeded from content/fit). */
export default async function AdminFitPage() {
  await requireAdminUserId();
  const [fit, finder] = await Promise.all([getFitData(), getGroupFinderData()]);
  return (
    <div className="space-y-6">
      <PageHeader title="Fit content" subtitle="Fit questions, group profiles and Group Finder weights. Changes apply right away." />
      <FitAdmin fit={fit} finder={finder} />
    </div>
  );
}
