import { requireAdminUserId } from "@/lib/auth";
import { findSuspects } from "@/lib/bot-review";
import { PageHeader } from "@/components/ui/page-header";
import { BotReview } from "@/components/admin/bot-review";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account review" };

export default async function UserReviewPage() {
  await requireAdminUserId();
  const { suspects, softDeleted } = await findSuspects();
  const cutoff = new Date(new Date().getTime() - 30 * 86_400_000);
  const purgeable = softDeleted.filter((r) => r.deletedAt && r.deletedAt < cutoff).length;
  const ser = (rows: typeof suspects) =>
    rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), lastActiveAt: r.lastActiveAt?.toISOString() ?? null, deletedAt: r.deletedAt?.toISOString() ?? null }));
  return (
    <div className="space-y-6">
      <PageHeader
        title="Account review"
        subtitle="Accounts that look like bots. Nothing is deleted automatically. Delete hides and disables an account; you can restore it."
      />
      <BotReview suspects={ser(suspects)} softDeleted={ser(softDeleted)} purgeable={purgeable} />
    </div>
  );
}
