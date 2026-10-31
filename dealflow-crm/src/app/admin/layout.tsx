import Link from "next/link";
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
    <div className="min-h-screen bg-[#0a0a0a] text-[#f0f0f0]">
      <div className="border-b border-[#2a2a2a] bg-[#111111] px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4">
          <span className="text-sm font-semibold tracking-wide text-[#f5f5f5]">{isAdmin ? "Admin" : "Mentor"}</span>
          <AdminSubnav draftDealCount={draftDealCount} isAdmin={isAdmin} openMentorQuestions={openMentorQuestions} />
          <Link href="/dashboard" className="ml-auto text-xs text-[#888888] underline-offset-4 hover:text-[#f0f0f0] hover:underline">
            ← App
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-7xl p-4 md:p-6">{children}</div>
    </div>
  );
}
