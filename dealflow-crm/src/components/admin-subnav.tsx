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
    <nav aria-label="Admin" className="-mb-px flex gap-6 overflow-x-auto border-b border-border text-sm">
      {links.filter((l) => isAdmin || !l.adminOnly).map(({ href, label, exact, adminOnly: _adminOnly, ...rest }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        const badge =
          "showDraftBadge" in rest && rest.showDraftBadge && draftDealCount > 0 ? (
            <span className="ml-1.5 rounded bg-warn-bg px-1.5 py-0.5 text-[11px] font-semibold text-warn">
              {draftDealCount} drafts
            </span>
          ) : "showMentorBadge" in rest && rest.showMentorBadge && openMentorQuestions > 0 ? (
            <span className="ml-1.5 rounded-full bg-accent px-1.5 text-[11px] font-semibold text-on-accent">
              {openMentorQuestions}
            </span>
          ) : null;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "-mb-px inline-flex shrink-0 items-center border-b-2 px-0.5 pb-2.5 pt-1 transition-colors",
              active ? "border-accent font-semibold text-accent" : "border-transparent text-ink-2 hover:text-ink",
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
