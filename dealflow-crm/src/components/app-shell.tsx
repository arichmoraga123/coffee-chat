"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "dealflow-sidebar-groups-v1";

type NavItem = { href: string; label: string };

type CollapsibleGroup = {
  id: string;
  title: string;
  items: NavItem[];
};

const OVERVIEW_ITEM: NavItem = { href: "/", label: "Dashboard" };

const COLLAPSIBLE_GROUPS: CollapsibleGroup[] = [
  {
    id: "networking",
    title: "👥 Networking",
    items: [
      { href: "/contacts", label: "Contacts" },
      { href: "/firms", label: "Firms" },
      { href: "/pipeline", label: "Pipeline" },
      { href: "/tasks", label: "Tasks" },
    ],
  },
  {
    id: "prep",
    title: "📚 Prep",
    items: [
      { href: "/questions", label: "Question Bank" },
      { href: "/mock-interview", label: "Mock Interview" },
      { href: "/resume", label: "Resume Review" },
      { href: "/cases", label: "Cases" },
    ],
  },
  {
    id: "research",
    title: "🔍 Research",
    items: [
      { href: "/deals", label: "Deal Tracker" },
      { href: "/research", label: "Firm Research" },
      { href: "/resources", label: "Resources" },
      { href: "/vault", label: "Vault" },
    ],
  },
  {
    id: "scheduling",
    title: "📅 Scheduling",
    items: [
      { href: "/calendar", label: "Calendar" },
      { href: "/recruiting-calendar", label: "Recruiting Calendar" },
    ],
  },
  {
    id: "community",
    title: "👥 Community",
    items: [
      { href: "/groups", label: "Study Groups" },
      { href: "/timelines", label: "Firm Timelines" },
      { href: "/debriefs", label: "Debriefs" },
    ],
  },
  {
    id: "personal",
    title: "💼 Personal",
    items: [
      { href: "/offers", label: "Offer Compare" },
      { href: "/profile", label: "Profile" },
    ],
  },
];

const ADMIN_GROUP: CollapsibleGroup = {
  id: "admin",
  title: "🛡️ Admin",
  items: [
    { href: "/admin", label: "Overview" },
    { href: "/admin/questions", label: "Questions" },
    { href: "/admin/deals", label: "Deals" },
    { href: "/admin#admin-users", label: "Users" },
  ],
};

function defaultsForViewport(isMobile: boolean): Record<string, boolean> {
  const allIds = [...COLLAPSIBLE_GROUPS.map((g) => g.id), ADMIN_GROUP.id];
  const base: Record<string, boolean> = {};
  for (const id of allIds) {
    base[id] = false;
  }
  if (!isMobile) {
    base.networking = true;
    base.prep = true;
  }
  return base;
}

function loadOpenGroups(isMobile: boolean): Record<string, boolean> {
  const fallback = defaultsForViewport(isMobile);
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const merged = { ...fallback };
    for (const key of Object.keys(fallback)) {
      if (key in parsed && typeof parsed[key] === "boolean") {
        merged[key] = parsed[key] as boolean;
      }
    }
    return merged;
  } catch {
    return fallback;
  }
}

function saveOpenGroups(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function pathMatchesItem(pathname: string, href: string): boolean {
  if (href.includes("#")) {
    const base = (href.split("#")[0] ?? "").replace(/\/$/, "") || "/";
    if (base === "/") return pathname === "/";
    // Hash deep links: highlight only on exact path (not /admin/questions vs /admin#…)
    return pathname === base;
  }
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupIdForPathname(pathname: string): string | null {
  for (const g of COLLAPSIBLE_GROUPS) {
    if (g.items.some((item) => pathMatchesItem(pathname, item.href))) return g.id;
  }
  if (pathname.startsWith("/admin")) return "admin";
  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => defaultsForViewport(false));

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminUser = session?.user?.role === "ADMIN";

  const groupsToRender = useMemo(() => {
    return isAdminUser ? [...COLLAPSIBLE_GROUPS, ADMIN_GROUP] : COLLAPSIBLE_GROUPS;
  }, [isAdminUser]);

  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    setOpenGroups(loadOpenGroups(mobile));
  }, []);

  useEffect(() => {
    if (isAuthPage) return;
    const gid = groupIdForPathname(pathname);
    if (!gid) return;
    setOpenGroups((prev) => {
      if (prev[gid]) return prev;
      const next = { ...prev, [gid]: true };
      saveOpenGroups(next);
      return next;
    });
  }, [pathname, isAuthPage]);

  const toggleGroup = useCallback((id: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveOpenGroups(next);
      return next;
    });
  }, []);

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

  useEffect(() => {
    if (isAuthPage || isAdminRoute || !session?.user) return;
    void fetch("/api/user/ping", { method: "POST" }).catch(() => {});
  }, [isAuthPage, isAdminRoute, session?.user]);

  const renderLink = (item: NavItem) => {
    const active = pathMatchesItem(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={closeMobile}
        className={cn(
          "block rounded-r-md border-l-[3px] py-2 pl-3 pr-2 text-sm transition-all duration-200",
          active
            ? "border-cyan-400 bg-cyan-500/[0.12] font-medium text-cyan-100 shadow-[inset_0_0_24px_-12px_rgba(0,188,212,0.25)]"
            : "border-transparent text-zinc-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-zinc-100",
        )}
      >
        {item.label}
      </Link>
    );
  };

  if (isAuthPage) {
    return <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">{children}</main>;
  }

  if (isAdminRoute) {
    return <div className="min-h-screen bg-zinc-950 text-zinc-100">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
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
          "fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-white/10 bg-gradient-to-b from-zinc-950 via-zinc-950 to-black p-4 transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0",
          mobileOpen ? "translate-x-0 shadow-xl shadow-black/40" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="mb-4 text-lg font-bold tracking-wide text-cyan-400 drop-shadow-[0_0_14px_rgba(0,188,212,0.35)]">
          DealFlow CRM
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          <div className="pb-1">
            <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">📊 Overview</p>
            {renderLink(OVERVIEW_ITEM)}
          </div>

          {groupsToRender.map((group) => {
            const open = openGroups[group.id] ?? false;
            return (
              <div key={group.id} className="border-t border-white/5 pt-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="flex w-full items-center justify-between gap-1 rounded-md px-1 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-zinc-200"
                  aria-expanded={open}
                >
                  <span className="min-w-0 leading-snug">{group.title}</span>
                  <ChevronDown
                    className={cn("h-4 w-4 shrink-0 text-zinc-500 transition-transform", open ? "rotate-0" : "-rotate-90")}
                    aria-hidden
                  />
                </button>
                {open ? <div className="mt-0.5 space-y-0.5 pb-1">{group.items.map(renderLink)}</div> : null}
              </div>
            );
          })}
        </nav>
        <button
          className="mt-4 text-left text-xs text-zinc-500 transition-colors duration-200 hover:text-zinc-200"
          onClick={() => {
            closeMobile();
            void signOut({ callbackUrl: "/login" });
          }}
          type="button"
        >
          Log out
        </button>
        <p className="mt-6 text-[10px] text-zinc-600">Shortcuts: C, I, T</p>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-3 border-b border-white/10 bg-zinc-950/90 px-3 backdrop-blur-md md:hidden">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-md text-xl text-zinc-100 transition-colors hover:bg-white/[0.06]"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <span className="text-sm font-bold tracking-wide text-cyan-400 drop-shadow-[0_0_10px_rgba(0,188,212,0.3)]">
            DealFlow CRM
          </span>
        </header>
        <main className="min-w-0 flex-1 space-y-8 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
