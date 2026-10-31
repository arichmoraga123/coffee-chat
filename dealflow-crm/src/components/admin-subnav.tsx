"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard", exact: true, adminOnly: true },
  { href: "/admin/questions", label: "Questions", exact: false, adminOnly: true },
  { href: "/admin/recruiting-calendar", label: "Recruiting calendar", exact: false, adminOnly: true },
  { href: "/admin/deals", label: "Deals", exact: false, adminOnly: true, showDraftBadge: true as const },
  { href: "/admin/club/roster", label: "PE@Broad roster", exact: false, adminOnly: true },
  { href: "/admin/learn/questions", label: "Learn: mentor queue", exact: false, adminOnly: false, showMentorBadge: true as const },
  { href: "/admin/learn/cohort", label: "Learn: cohort", exact: false, adminOnly: false },
  { href: "/admin/learn/resources", label: "Learn: workbooks", exact: false, adminOnly: true },
] as const;

export function AdminSubnav({
  draftDealCount = 0,
  isAdmin = true,
  openMentorQuestions = 0,
}: {
  draftDealCount?: number;
  isAdmin?: boolean;
  openMentorQuestions?: number;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 text-sm">
      {links.filter((l) => isAdmin || !l.adminOnly).map(({ href, label, exact, adminOnly: _adminOnly, ...rest }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        const badge =
          "showDraftBadge" in rest && rest.showDraftBadge && draftDealCount > 0 ? (
            <span className="ml-1.5 rounded-full bg-amber-500/25 px-2 py-0.5 text-[10px] font-medium text-amber-200">
              {draftDealCount} drafts pending
            </span>
          ) : "showMentorBadge" in rest && rest.showMentorBadge && openMentorQuestions > 0 ? (
            <span className="ml-1.5 rounded-full bg-sky-500/25 px-2 py-0.5 text-[10px] font-medium text-sky-200">
              {openMentorQuestions} open
            </span>
          ) : null;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center rounded px-3 py-1.5 transition-colors",
              active ? "bg-white/[0.06] text-[#f5f5f5]" : "text-[#888888] hover:bg-[#161616] hover:text-[#f0f0f0]",
            )}
          >
            {label}
            {badge}
          </Link>
        );
      })}
    </nav>
  );
}
