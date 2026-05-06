"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/club", label: "Hub" },
  { href: "/club/announcements", label: "Announcements" },
  { href: "/club/content", label: "Content" },
  { href: "/club/projects", label: "Projects" },
  { href: "/club/events", label: "Events" },
  { href: "/club/members", label: "Members" },
] as const;

export function ClubSubnav() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex flex-wrap gap-1 rounded-lg border border-zinc-800 bg-zinc-900/40 p-1">
      {LINKS.map(({ href, label }) => {
        const active = pathname === href || (href !== "/club" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
