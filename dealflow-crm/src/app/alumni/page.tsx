import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { AlumniDirectory } from "@/components/alumni-directory";

export const dynamic = "force-dynamic";

export default async function AlumniPage() {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { schoolId: true, school: { select: { name: true } } },
  });

  return (
    <AlumniDirectory initialSchoolId={user?.schoolId ?? null} initialSchoolName={user?.school?.name ?? null} />
  );
}
