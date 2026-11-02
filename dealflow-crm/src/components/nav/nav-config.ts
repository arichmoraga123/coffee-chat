import {
  BookOpen,
  Briefcase,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Home,
  LayoutGrid,
  Library,
  MessageSquare,
  NotebookPen,
  ShieldAlert,
  Swords,
  Trophy,
  Mic,
  Settings,
  Shield,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Extra path prefixes that should mark this item active (its tab pages). */
  also?: string[];
  count?: "dailyLeft" | "mentorOpen" | "unread" | "pendingChallenges" | "tasksDue";
};
export type NavGroup = { id: string; label: string; items: NavItem[]; audience?: "club" | "admin" | "mentor" };

export const HOME: NavItem = { href: "/dashboard", label: "Home", icon: Home };

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "learn",
    label: "Learn",
    items: [
      { href: "/learn", label: "Lessons", icon: BookOpen },
      { href: "/practice", label: "Practice", icon: Target, also: ["/questions"] },
      { href: "/practice/daily", label: "Daily set", icon: ClipboardCheck, count: "dailyLeft" },
    ],
  },
  {
    id: "recruiting",
    label: "Recruiting",
    items: [
      { href: "/recruiting/openings", label: "Openings", icon: BriefcaseBusiness },
      { href: "/pipeline", label: "Pipeline", icon: TrendingUp, also: ["/offers"] },
      { href: "/contacts", label: "Contacts", icon: Users, also: ["/tasks", "/debriefs", "/emails"], count: "tasksDue" },
      { href: "/firms", label: "Firms", icon: Building2, also: ["/deals", "/timelines", "/research"] },
      { href: "/calendar", label: "Calendar", icon: CalendarDays, also: ["/recruiting-calendar", "/roadmap"] },
    ],
  },
  {
    id: "club",
    label: "PE@Broad",
    audience: "club",
    items: [
      { href: "/club", label: "Club", icon: LayoutGrid, also: ["/club/announcements", "/club/events", "/club/projects", "/club/content", "/groups", "/club/pe-broad"] },
      { href: "/club/pe-broad/members", label: "Members", icon: Users, also: ["/club/members"] },
      { href: "/club/pe-broad/leaderboard", label: "Standings", icon: Trophy },
      { href: "/messages", label: "Messages", icon: MessageSquare, count: "unread" },
      { href: "/challenges", label: "Challenges", icon: Swords, count: "pendingChallenges" },
    ],
  },
  {
    id: "tools",
    label: "Tools",
    items: [
      { href: "/stories", label: "Storybank", icon: NotebookPen },
      { href: "/mock-interview", label: "Mock interviews", icon: Mic },
      { href: "/resume", label: "Resume review", icon: FileText },
      { href: "/pitch-builder", label: "Stock pitch", icon: Briefcase },
      { href: "/resources", label: "Resources", icon: Library, also: ["/cases", "/vault"] },
    ],
  },
  {
    id: "mentor",
    label: "Mentor",
    audience: "mentor",
    items: [
      { href: "/admin/learn/questions", label: "Mentor queue", icon: GraduationCap, count: "mentorOpen" },
      { href: "/admin/learn/cohort", label: "Cohort progress", icon: ClipboardCheck },
    ],
  },
  {
    id: "admin",
    label: "Admin",
    audience: "admin",
    items: [
      { href: "/admin", label: "Admin", icon: Shield, also: ["/schools", "/comp", "/alumni"] },
      { href: "/admin/club/roster", label: "Roster", icon: Users },
      { href: "/admin/users/review", label: "Account review", icon: ShieldAlert },
      { href: "/admin/questions", label: "Question editor", icon: Target },
      { href: "/admin/learn/questions", label: "Mentor queue", icon: GraduationCap, count: "mentorOpen" },
    ],
  },
];

export const SETTINGS: NavItem = { href: "/profile", label: "Settings", icon: Settings };

/** Pages that were folded into a parent: shown as tabs under the parent's header. */
export const SECTION_TABS: { match: string[]; tabs: { href: string; label: string }[] }[] = [
  {
    match: ["/practice", "/questions"],
    tabs: [
      { href: "/practice", label: "Practice" },
      { href: "/practice/daily", label: "Daily set" },
      { href: "/questions", label: "Question bank" },
    ],
  },
  { match: ["/pipeline", "/offers"], tabs: [{ href: "/pipeline", label: "Pipeline" }, { href: "/offers", label: "Offers" }] },
  {
    match: ["/contacts", "/tasks", "/debriefs", "/emails"],
    tabs: [
      { href: "/contacts", label: "Contacts" },
      { href: "/emails", label: "Email writer" },
      { href: "/tasks", label: "Tasks" },
      { href: "/debriefs", label: "Debriefs" },
    ],
  },
  {
    match: ["/firms", "/deals", "/timelines", "/research"],
    tabs: [
      { href: "/firms", label: "Firms" },
      { href: "/deals", label: "Deals" },
      { href: "/timelines", label: "Timelines" },
      { href: "/research", label: "Research" },
    ],
  },
  {
    match: ["/calendar", "/recruiting-calendar", "/roadmap"],
    tabs: [
      { href: "/calendar", label: "Calendar" },
      { href: "/recruiting-calendar", label: "Recruiting tracker" },
      { href: "/roadmap", label: "Roadmap" },
    ],
  },
  {
    match: ["/club", "/groups"],
    tabs: [
      { href: "/club", label: "Overview" },
      { href: "/club/pe-broad", label: "Activity" },
      { href: "/club/pe-broad/members", label: "Members" },
      { href: "/club/pe-broad/leaderboard", label: "Standings" },
      { href: "/club/announcements", label: "Announcements" },
      { href: "/club/events", label: "Events" },
      { href: "/club/projects", label: "Projects" },
      { href: "/club/content", label: "Content" },
      { href: "/groups", label: "Study groups" },
    ],
  },
  {
    match: ["/resources", "/cases", "/vault"],
    tabs: [
      { href: "/resources", label: "Resources" },
      { href: "/cases", label: "Cases" },
      { href: "/vault", label: "Vault" },
    ],
  },
];

export function pathMatches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The most specific nav item for a path (so /practice/daily doesn't also light up /practice). */
export function activeHref(pathname: string, items: NavItem[]): string | null {
  let best: { href: string; len: number } | null = null;
  for (const it of items) {
    for (const p of [it.href, ...(it.also ?? [])]) {
      if (pathMatches(pathname, p) && (!best || p.length > best.len)) best = { href: it.href, len: p.length };
    }
  }
  return best?.href ?? null;
}

export function sectionTabsFor(pathname: string) {
  const section = SECTION_TABS.find((s) => s.match.some((m) => pathMatches(pathname, m)));
  if (!section) return null;
  // Most specific tab wins.
  let active: string | null = null;
  for (const t of section.tabs) if (pathMatches(pathname, t.href) && (!active || t.href.length > active.length)) active = t.href;
  return section.tabs.map((t) => ({ ...t, active: t.href === active }));
}

/** Mobile bottom bar. */
export const MOBILE_TABS: { href: string; label: string; icon: LucideIcon; match: string[] }[] = [
  { href: "/dashboard", label: "Home", icon: Home, match: ["/dashboard"] },
  { href: "/learn", label: "Learn", icon: BookOpen, match: ["/learn", "/practice", "/questions"] },
  {
    href: "/pipeline",
    label: "Recruiting",
    icon: TrendingUp,
    match: ["/recruiting", "/pipeline", "/offers", "/contacts", "/tasks", "/debriefs", "/emails", "/firms", "/deals", "/timelines", "/research", "/calendar", "/recruiting-calendar", "/roadmap"],
  },
  { href: "/club", label: "Club", icon: Users, match: ["/club", "/groups", "/messages", "/challenges"] },
];
