"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Dashboard" },
  { href: "/contacts", label: "Contacts" },
  { href: "/firms", label: "Firms" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/tasks", label: "Tasks" },
  { href: "/calendar", label: "📅 Calendar" },
  { href: "/questions", label: "📚 Question Bank" },
  { href: "/resources", label: "🔗 Resources" },
  { href: "/timelines", label: "Firm Timelines" },
  { href: "/profile", label: "Profile" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const navItems =
    session?.user?.role === "ADMIN"
      ? [...nav, { href: "/admin/questions", label: "Admin" }]
      : nav;
  useEffect(() => {
    if (isAuthPage) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const key = event.key.toLowerCase();
      if (!["c", "i", "t"].includes(key)) return;
      window.dispatchEvent(new CustomEvent("dealflow-shortcut", { detail: key }));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isAuthPage]);

  if (isAuthPage) {
    return <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      <aside className="w-56 border-r border-zinc-800 p-4">
        <div className="mb-5 text-sm font-semibold tracking-wide text-cyan-400">
          DealFlow CRM
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded px-3 py-2 text-sm",
                pathname === item.href
                  ? "bg-cyan-500/20 text-cyan-300"
                  : "text-zinc-300 hover:bg-zinc-900",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          className="mt-4 text-xs text-zinc-400 hover:text-zinc-200"
          onClick={() => signOut({ callbackUrl: "/login" })}
          type="button"
        >
          Log out
        </button>
        <p className="mt-6 text-xs text-zinc-500">Shortcuts: C, I, T</p>
      </aside>
      <main className="flex-1 p-5">{children}</main>
    </div>
  );
}
