import { requireAdminUserId } from "@/lib/auth";
import { RosterAdmin } from "@/components/admin/roster-admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "PE@Broad roster" };

export default async function RosterPage() {
  await requireAdminUserId();
  return <RosterAdmin />;
}
