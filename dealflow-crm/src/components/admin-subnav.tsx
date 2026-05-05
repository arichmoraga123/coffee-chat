"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/questions", label: "Questions" },
];

export function AdminSubnav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 text-sm">
      {links.map(({ href, label }) => {
        const active =
          href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "rounded px-3 py-1.5 transition-colors",
              active ? "bg-cyan-500/20 text-cyan-300" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
