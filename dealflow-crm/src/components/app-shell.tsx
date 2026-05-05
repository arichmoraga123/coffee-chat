"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  { href: "/mock-interview", label: "🎤 Mock Interview" },
  { href: "/research", label: "🔬 Research" },
  { href: "/deals", label: "📋 Deal Tracker" },
  { href: "/vault", label: "📁 Vault" },
  { href: "/groups", label: "👥 Study Groups" },
  { href: "/debriefs", label: "📝 Debriefs" },
  { href: "/offers", label: "💰 Offer Compare" },
  { href: "/resources", label: "🔗 Resources" },
  { href: "/timelines", label: "Firm Timelines" },
  { href: "/profile", label: "Profile" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const navItems =
    session?.user?.role === "ADMIN"
      ? [...nav, { href: "/admin/questions", label: "Admin" }]
      : nav;

  const closeMobile = () => setMobileOpen(false);

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

  useEffect(() => {
    if (isAuthPage || !mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isAuthPage, mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (isAuthPage) {
    return <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
      {/* Mobile overlay */}
      <button
        type="button"
        aria-label="Close menu"
        className={cn(
          "fixed inset-0 z-40 bg-black/60 transition-opacity md:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeMobile}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-zinc-800 bg-zinc-950 p-4 transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-xl shadow-black/40" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="mb-5 text-sm font-semibold tracking-wide text-cyan-400">DealFlow CRM</div>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMobile}
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
          className="mt-4 text-left text-xs text-zinc-400 hover:text-zinc-200"
          onClick={() => {
            closeMobile();
            void signOut({ callbackUrl: "/login" });
          }}
          type="button"
        >
          Log out
        </button>
        <p className="mt-6 text-xs text-zinc-500">Shortcuts: C, I, T</p>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-950 px-3 md:hidden">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-md text-xl text-zinc-100 hover:bg-zinc-800"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <span className="text-sm font-semibold tracking-wide text-cyan-400">DealFlow CRM</span>
        </header>
        <main className="min-w-0 flex-1 p-4 md:p-5">{children}</main>
      </div>
    </div>
  );
}
