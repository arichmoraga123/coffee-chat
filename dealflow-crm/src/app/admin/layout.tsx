import Link from "next/link";
import { requireAdminUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminSubnav } from "@/components/admin-subnav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminUserId();
  const draftDealCount = await prisma.deal.count({ where: { status: "draft" } });
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-white/10 bg-zinc-950/95 px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4">
          <span className="text-sm font-semibold tracking-wide text-cyan-400">Admin</span>
          <AdminSubnav draftDealCount={draftDealCount} />
          <Link href="/" className="ml-auto text-xs text-zinc-500 hover:text-zinc-300">
            ← App
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-7xl p-4 md:p-6">{children}</div>
    </div>
  );
}
