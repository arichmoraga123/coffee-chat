"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { HOME, NAV_GROUPS, SECTION_TABS, SETTINGS } from "./nav-config";

type Hit = { type: "lesson" | "contact" | "firm" | "member"; id: string; title: string; subtitle?: string; href: string };

const GROUP_LABEL: Record<Hit["type"], string> = { lesson: "Lessons", contact: "Contacts", firm: "Firms", member: "Members" };

export function CommandPalette({ open, onOpenChange, role }: { open: boolean; onOpenChange: (o: boolean) => void; role: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);

  const pages = useMemo(() => {
    const out = new Map<string, string>([[HOME.href, HOME.label], [SETTINGS.href, SETTINGS.label]]);
    for (const g of NAV_GROUPS) {
      if (g.audience === "admin" && role !== "ADMIN") continue;
      if (g.audience === "mentor" && role !== "MENTOR" && role !== "ADMIN") continue;
      for (const it of g.items) out.set(it.href, it.label);
    }
    for (const s of SECTION_TABS) for (const t of s.tabs) if (!out.has(t.href)) out.set(t.href, t.label);
    return [...out.entries()].map(([href, label]) => ({ href, label }));
  }, [role]);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      return;
    }
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (res.ok) setHits(((await res.json()) as { hits: Hit[] }).hits);
      } catch {
        /* aborted */
      }
    }, 150);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [q, open]);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  if (!open) return null;
  const groups = (["lesson", "contact", "firm", "member"] as const)
    .map((type) => ({ type, items: hits.filter((h) => h.type === type) }))
    .filter((g) => g.items.length);
  const term = q.trim().toLowerCase();
  const pageHits = term ? pages.filter((p) => p.label.toLowerCase().includes(term)) : pages.slice(0, 8);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-[12vh]" onMouseDown={() => onOpenChange(false)}>
      <Command
        label="Search"
        shouldFilter={false}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Escape" && onOpenChange(false)}
        className="w-full max-w-xl overflow-hidden rounded-[var(--radius-xl)] border border-border bg-surface text-ink"
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
          <Command.Input
            autoFocus
            value={q}
            onValueChange={setQ}
            placeholder="Search lessons, contacts, firms, members, pages…"
            className="h-12 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3 focus-visible:outline-none"
          />
          <kbd className="hidden rounded border border-border px-1.5 text-[11px] text-ink-3 sm:inline">Esc</kbd>
        </div>
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-ink-3">No results.</Command.Empty>
          {groups.map((g) => (
            <Command.Group key={g.type} heading={GROUP_LABEL[g.type]} className="mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-ink-3">
              {g.items.map((h) => (
                <Command.Item
                  key={`${h.type}-${h.id}`}
                  value={`${h.type}-${h.id}`}
                  onSelect={() => go(h.href)}
                  className="flex cursor-pointer flex-col rounded-[var(--radius)] px-3 py-2 data-[selected=true]:bg-accent-tint"
                >
                  <span className="text-sm text-ink">{h.title}</span>
                  {h.subtitle ? <span className="text-[13px] text-ink-3">{h.subtitle}</span> : null}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
          {pageHits.length ? (
            <Command.Group heading="Pages" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.06em] [&_[cmdk-group-heading]]:text-ink-3">
              {pageHits.map((p) => (
                <Command.Item
                  key={p.href}
                  value={`page-${p.href}`}
                  onSelect={() => go(p.href)}
                  className="cursor-pointer rounded-[var(--radius)] px-3 py-2 text-sm text-ink data-[selected=true]:bg-accent-tint"
                >
                  {p.label}
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}
        </Command.List>
      </Command>
    </div>
  );
}
