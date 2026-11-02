"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { signOut, useSession } from "next-auth/react";
import { LogOut, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Avatar } from "@/components/ui/avatar";
import { CountPill } from "@/components/ui/badge";
import { CommandPalette } from "@/components/nav/command-palette";
import { subscribeToUnread } from "@/lib/realtime";
import {
  HOME,
  MOBILE_TABS,
  NAV_GROUPS,
  SETTINGS,
  activeHref,
  pathMatches,
  type NavGroup,
  type NavItem,
} from "@/components/nav/nav-config";

type NavCounts = { name: string; role: string; clubMember: boolean; clubRole: string | null; dailyLeft: number; mentorOpen: number; unread: number; pendingChallenges: number; tasksDue: number; notificationsUnread: number; sidebarCollapsed?: boolean | null };

const SIDEBAR_KEY = "prospect:sidebar-collapsed";
const MID_WIDTH = "(min-width: 1024px) and (max-width: 1279px)";

/** Pages that open with the sidebar collapsed (they need the width). */
function routeWantsCollapsed(pathname: string) {
  return pathname === "/pipeline" || /^\/learn\/workbooks\/[^/]+\/guided/.test(pathname);
}

function readStoredPref(): boolean | null {
  try {
    const v = localStorage.getItem(SIDEBAR_KEY);
    return v === "1" ? true : v === "0" ? false : null;
  } catch {
    return null;
  }
}

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", MENTOR: "Mentor", USER: "Member" };

function visibleGroups(counts: NavCounts | null, role: string): NavGroup[] {
  return NAV_GROUPS.filter((g) => {
    if (g.audience === "club") return Boolean(counts?.clubMember) || role === "ADMIN";
    if (g.audience === "admin") return role === "ADMIN";
    if (g.audience === "mentor") return role === "MENTOR";
    return true;
  });
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [counts, setCounts] = useState<NavCounts | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  // Sidebar: the user's saved choice, a per-page override on pages that open collapsed, and the width default.
  const [pref, setPref] = useState<boolean | null>(null);
  const [pageOverride, setPageOverride] = useState<{ path: string; collapsed: boolean } | null>(null);
  const midWidth = useMediaQuery(MID_WIDTH);
  const [tip, setTip] = useState<{ label: string; top: number; left: number } | null>(null);

  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isPublicPage = pathname === "/" || pathname === "/pricing" || pathname.startsWith("/join");
  const bare = isAuthPage || isPublicPage;
  const role = counts?.role ?? session?.user?.role ?? "USER";
  const name = counts?.name || session?.user?.name || "";

  const groups = useMemo(() => visibleGroups(counts, role), [counts, role]);
  const allItems = useMemo(() => [HOME, SETTINGS, ...groups.flatMap((g) => g.items)], [groups]);
  const active = activeHref(pathname, allItems);

  const routeCollapsed = routeWantsCollapsed(pathname);
  const collapsed =
    pageOverride?.path === pathname ? pageOverride.collapsed : routeCollapsed ? true : (pref ?? midWidth);

  const toggleSidebar = useCallback(() => {
    const next = !collapsed;
    if (routeCollapsed) {
      setPageOverride({ path: pathname, collapsed: next });
      return;
    }
    setPref(next);
    try {
      localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
    void fetch("/api/user/ui-prefs", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sidebarCollapsed: next }),
    }).catch(() => {});
  }, [collapsed, routeCollapsed, pathname]);

  useEffect(() => {
    const stored = readStoredPref();
    if (stored !== null) setPref(stored);
  }, []);

  const refreshCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/nav");
      if (res.ok) {
        const data = (await res.json()) as NavCounts;
        setCounts(data);
        // The saved setting wins over this browser's copy.
        if (typeof data.sidebarCollapsed === "boolean") {
          setPref(data.sidebarCollapsed);
          try {
            localStorage.setItem(SIDEBAR_KEY, data.sidebarCollapsed ? "1" : "0");
          } catch {
            /* storage unavailable */
          }
        }
      }
    } catch {
      /* offline */
    }
  }, []);

  useEffect(() => {
    if (bare || !session?.user) return;
    void refreshCounts();
  }, [bare, session?.user, pathname, refreshCounts]);

  // Unread messages and pending challenges: re-check every 30 seconds.
  useEffect(() => {
    if (bare || !session?.user) return;
    return subscribeToUnread(() => void refreshCounts());
  }, [bare, session?.user, refreshCounts]);

  useEffect(() => {
    if (bare || !session?.user || pathname.startsWith("/admin")) return;
    void fetch("/api/user/ping", { method: "POST" }).catch(() => {});
  }, [bare, pathname, session?.user]);

  useEffect(() => {
    setMoreOpen(false);
    setTip(null);
  }, [pathname]);

  // ⌘K / Ctrl+K opens search. C / I / T are the existing quick-add shortcuts.
  useEffect(() => {
    if (bare) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("prospect-toggle-sidebar"));
        return;
      }
      const t = e.target as HTMLElement | null;
      if (t && (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (["c", "i", "t"].includes(key)) window.dispatchEvent(new CustomEvent("prospect-shortcut", { detail: key }));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bare]);

  useEffect(() => {
    const onToggle = () => toggleSidebar();
    window.addEventListener("prospect-toggle-sidebar", onToggle);
    return () => window.removeEventListener("prospect-toggle-sidebar", onToggle);
  }, [toggleSidebar]);

  if (bare) {
    return <main className="min-h-screen bg-bg p-4 text-ink md:p-6">{children}</main>;
  }

  const tipHandlers = (label: string) => {
    const show = (e: React.SyntheticEvent<HTMLElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      setTip({ label, top: r.top + r.height / 2, left: r.right + 8 });
    };
    return { onMouseEnter: show, onFocus: show, onMouseLeave: () => setTip(null), onBlur: () => setTip(null) };
  };

  const countFor = (it: NavItem) => (it.count && counts ? counts[it.count] : 0);

  const link = (it: NavItem, opts?: { compact?: boolean; onClick?: () => void }) => {
    const isActive = active === it.href;
    const Icon = it.icon;
    const n = countFor(it);
    return (
      <Link
        key={`${it.href}-${it.label}`}
        href={it.href}
        onClick={opts?.onClick}
        {...(opts?.compact ? tipHandlers(n > 0 ? `${it.label} · ${n}` : it.label) : {})}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "group relative flex h-11 items-center gap-2.5 rounded-[var(--radius)] px-2.5 text-sm transition-colors md:h-9",
          opts?.compact && "justify-center px-0",
          isActive ? "bg-accent-tint font-semibold text-accent" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        {opts?.compact ? (
          <>
            <span className="sr-only">{it.label}</span>
            {n > 0 ? <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-accent ring-2 ring-surface" aria-hidden /> : null}
          </>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate">{it.label}</span>
            <CountPill count={n} />
          </>
        )}
      </Link>
    );
  };

  const navBody = (compact: boolean, onClick?: () => void) => (
    <>
      <div className="space-y-0.5">{link(HOME, { compact, onClick })}</div>
      {groups.map((g) => (
        <div key={g.id} className="mt-5">
          {compact ? <div className="mx-3 mb-2 border-t border-divider" /> : <p className="eyebrow mb-1.5 px-2.5">{g.label}</p>}
          <div className="space-y-0.5">{g.items.map((it) => link(it, { compact, onClick }))}</div>
        </div>
      ))}
    </>
  );

  const searchButton = (compact: boolean) => (
    <button
      type="button"
      onClick={() => setPaletteOpen(true)}
      className={cn(
        "flex h-9 w-full items-center gap-2 rounded-[var(--radius)] border border-border-strong bg-surface text-sm text-ink-3 hover:text-ink",
        compact ? "justify-center" : "px-2.5",
      )}
      aria-label="Search (Command K)"
      {...(compact ? tipHandlers("Search · ⌘K") : {})}
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden />
      {compact ? null : (
        <>
          <span className="flex-1 text-left">Search</span>
          <kbd className="rounded border border-border px-1.5 text-[11px]">⌘K</kbd>
        </>
      )}
    </button>
  );

  const footer = (compact: boolean) => (
    <div className="mt-4 space-y-0.5 border-t border-divider pt-3">
      {link(SETTINGS, { compact })}
      <div className={cn("flex items-center gap-2.5 px-2.5 py-2", compact && "justify-center px-0")}>
        <Avatar name={name} size={28} />
        {compact ? null : (
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-ink">{name || "You"}</p>
            <p className="text-xs text-ink-3">{ROLE_LABEL[role] ?? "Member"}</p>
          </div>
        )}
        {compact ? null : (
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: "/login" })}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius)] text-ink-3 hover:bg-surface-2 hover:text-ink"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  const bell = (align: "left" | "right") => <NotificationBell unread={counts?.notificationsUnread ?? 0} onChange={() => void refreshCounts()} align={align} />;

  const toggleButton = (
    <button
      type="button"
      onClick={toggleSidebar}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      title={`${collapsed ? "Expand" : "Collapse"} sidebar (Ctrl/⌘ + \\)`}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius)] text-ink-3 hover:bg-surface-2 hover:text-ink"
    >
      {collapsed ? <PanelLeftOpen className="h-4 w-4" aria-hidden /> : <PanelLeftClose className="h-4 w-4" aria-hidden />}
    </button>
  );

  const brand = (compact: boolean, withToggle = false) => (
    <div className={cn("mb-4 flex items-center gap-1", compact ? "flex-col" : "justify-between")}>
    {withToggle && compact ? toggleButton : null}
    <Link href="/dashboard" className={cn("flex min-w-0 items-center gap-2.5", compact && "justify-center")}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius)] bg-accent text-sm font-bold text-on-accent">P</span>
      {compact ? null : (
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold leading-tight text-ink">Prospect</span>
          <span className="block text-xs text-ink-3">PE@Broad · MSU</span>
        </span>
      )}
    </Link>
    <div className={cn("flex items-center", compact && "flex-col")}>
      {bell("left")}
      {withToggle && !compact ? toggleButton : null}
    </div>
    </div>
  );

  const mobileActive = MOBILE_TABS.find((t) => t.match.some((m) => pathMatches(pathname, m)))?.href ?? (moreOpen ? "more" : null);

  return (
    <div className="flex min-h-screen bg-bg text-ink">
      {/* Desktop sidebar (≥1024px) */}
      <aside
        className={cn(
          "sticky top-0 z-40 hidden h-screen shrink-0 flex-col border-r border-border bg-surface py-4 transition-[width] duration-150 ease-out lg:flex",
          collapsed ? "w-16 px-2" : "w-60 px-3",
        )}
      >
        {brand(collapsed, true)}
        {searchButton(collapsed)}
        <nav aria-label="Main" className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {navBody(collapsed)}
        </nav>
        {footer(collapsed)}
      </aside>

      {/* Tablet icon rail (768–1023px) */}
      <aside className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col border-r border-border bg-surface px-2 py-4 md:flex lg:hidden">
        {brand(true)}
        {searchButton(true)}
        <nav aria-label="Main" className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {navBody(true)}
        </nav>
        {footer(true)}
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Phone top bar */}
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-border bg-surface px-4 md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] bg-accent text-xs font-bold text-on-accent">P</span>
            <span className="text-[15px] font-semibold">Prospect</span>
          </Link>
          <div className="flex items-center">
            {bell("right")}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-[var(--radius)] text-ink-2"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main
          className={cn(
            "mx-auto w-full min-w-0 flex-1 space-y-6 px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-8",
            // Wide working pages (guided spreadsheet, pipeline board) use the full width.
            routeCollapsed ? "max-w-none lg:px-6" : "max-w-[1200px] lg:px-10",
          )}
        >
          {children}
        </main>
      </div>

      {/* Phone bottom tab bar */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {MOBILE_TABS.map((t) => {
          const Icon = t.icon;
          const on = mobileActive === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={on ? "page" : undefined}
              className={cn("flex h-12 flex-col items-center justify-center gap-0.5 text-[11px]", on ? "font-semibold text-accent" : "text-ink-3")}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {t.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn("flex h-12 flex-col items-center justify-center gap-0.5 text-[11px]", mobileActive === "more" ? "font-semibold text-accent" : "text-ink-3")}
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden />
          More
        </button>
      </nav>

      {/* Phone "More" sheet: the full navigation */}
      {moreOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/40 md:hidden" onMouseDown={() => setMoreOpen(false)}>
          <div
            className="mt-auto max-h-[85vh] overflow-y-auto rounded-t-[var(--radius-xl)] border-t border-border bg-surface px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="section-title">Menu</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="flex h-11 w-11 items-center justify-center text-ink-3"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {navBody(false, () => setMoreOpen(false))}
            {footer(false)}
          </div>
        </div>
      ) : null}

      {tip ? (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-[60] -translate-y-1/2 whitespace-nowrap rounded-[var(--radius-sm)] bg-ink px-2 py-1 text-xs font-medium text-bg shadow"
          style={{ top: tip.top, left: tip.left }}
        >
          {tip.label}
        </div>
      ) : null}

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} role={role} />
    </div>
  );
}
