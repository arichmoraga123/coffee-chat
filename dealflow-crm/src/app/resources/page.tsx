import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { ResourcesView } from "@/components/resources-view";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const userId = await requireUserId();
  const rows = await prisma.resourceBookmark.findMany({
    where: { userId },
    select: { resourceSlug: true },
  });
  return <ResourcesView initialBookmarkSlugs={rows.map((r) => r.resourceSlug)} />;
}
