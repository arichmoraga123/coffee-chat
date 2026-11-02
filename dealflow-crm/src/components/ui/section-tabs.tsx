"use client";

import { usePathname } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";
import { sectionTabsFor } from "@/components/nav/nav-config";

/** The route tabs for the current section (e.g. Contacts · Email writer · Tasks). Renders nothing outside a tabbed section. */
export function SectionTabs({ className }: { className?: string }) {
  const pathname = usePathname();
  const tabs = sectionTabsFor(pathname);
  if (!tabs) return null;
  return <Tabs className={className} items={tabs.map((t) => ({ href: t.href, label: t.label, active: t.active }))} />;
}
