"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/questions", label: "Questions", exact: false },
  { href: "/admin/recruiting-calendar", label: "Recruiting calendar", exact: false },
  { href: "/admin/deals", label: "Deals", exact: false, showDraftBadge: true as const },
] as const;

export function AdminSubnav({ draftDealCount = 0 }: { draftDealCount?: number }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 text-sm">
      {links.map(({ href, label, exact, ...rest }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        const badge =
          "showDraftBadge" in rest && rest.showDraftBadge && draftDealCount > 0 ? (
            <span className="ml-1.5 rounded-full bg-amber-500/25 px-2 py-0.5 text-[10px] font-medium text-amber-200">
              {draftDealCount} drafts pending
            </span>
          ) : null;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center rounded px-3 py-1.5 transition-colors",
              active ? "bg-cyan-500/20 text-cyan-300" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
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
