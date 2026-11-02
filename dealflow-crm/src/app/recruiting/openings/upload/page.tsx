import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { openingsAccess } from "@/lib/openings-data";
import { OpeningsUpload } from "@/components/openings/openings-upload";

export const dynamic = "force-dynamic";
export const metadata = { title: "Upload openings" };

export default async function OpeningsUploadPage() {
  const userId = await requireUserId();
  const access = await openingsAccess(userId);
  if (!access.canEdit) redirect("/recruiting/openings");
  const batches = await prisma.importBatch.findMany({
    where: { source: "openings", ...(access.isAdmin ? {} : { userId }) },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, fileName: true, counts: true, status: true, createdAt: true, user: { select: { name: true } } },
  });
  const clubs = access.isAdmin ? access.memberClubs : access.officerClubs;
  return (
    <OpeningsUpload
      isAdmin={access.isAdmin}
      clubs={clubs}
      batches={batches.map((b) => ({ id: b.id, fileName: b.fileName, counts: b.counts as Record<string, number>, status: b.status, createdAt: b.createdAt.toISOString(), by: b.user.name }))}
    />
  );
}
