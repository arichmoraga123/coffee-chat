import { requireMentorUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminSubnav } from "@/components/admin-subnav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Admins see everything; mentors only see the Learn tools (each non-Learn page re-checks for ADMIN).
  const { isAdmin } = await requireMentorUserId();
  const [draftDealCount, openMentorQuestions] = await Promise.all([
    isAdmin ? prisma.deal.count({ where: { status: "draft" } }) : Promise.resolve(0),
    prisma.mentorQuestion.count({ where: { status: "open" } }),
  ]);
  return (
    <div className="space-y-6">
      <AdminSubnav draftDealCount={draftDealCount} isAdmin={isAdmin} openMentorQuestions={openMentorQuestions} />
      <div>{children}</div>
    </div>
  );
}
