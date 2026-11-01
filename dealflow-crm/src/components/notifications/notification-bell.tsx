"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { id: string; kind: string; title: string; body: string; url: string; readAt: string | null; createdAt: string };

function ago(iso: string, now: number) {
  const m = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/** Bell with unread count and a dropdown of recent notifications. Clicking one opens it and marks it read. */
export function NotificationBell({ unread, onChange, align = "left", className }: { unread: number; onChange: () => void; align?: "left" | "right"; className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [now, setNow] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { items: Item[] } | null) => {
        if (!alive) return;
        setItems(d?.items ?? []);
        setNow(new Date().getTime());
      });
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      alive = false;
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const markRead = async (id?: string) => {
    await fetch("/api/notifications/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(id ? { id } : {}) });
    setItems((xs) => xs?.map((x) => (!id || x.id === id ? { ...x, readAt: x.readAt ?? new Date().toISOString() } : x)) ?? null);
    onChange();
  };

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-[var(--radius)] text-ink-2 hover:bg-surface-2 hover:text-ink"
      >
        <Bell className="h-[18px] w-[18px]" aria-hidden />
        {unread ? (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-on-accent">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          className={cn(
            "absolute top-10 z-50 w-[min(360px,calc(100vw-24px))] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-lg",
            align === "left" ? "left-0" : "right-0",
          )}
        >
          <div className="flex items-center justify-between border-b border-divider px-4 py-2.5">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {items?.some((i) => !i.readAt) ? (
              <button type="button" className="text-[13px] font-medium text-accent hover:underline" onClick={() => void markRead()}>
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {items === null ? (
              <p className="px-4 py-6 text-center text-[13px] text-ink-3">Loading…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px] text-ink-3">Nothing yet. Follow-up digests, mentor answers and club posts show up here.</p>
            ) : (
              <ul className="divide-y divide-divider">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        if (!n.readAt) void markRead(n.id);
                        router.push(n.url);
                      }}
                      className={cn("flex w-full gap-3 px-4 py-3 text-left hover:bg-surface-2", !n.readAt && "bg-accent-tint/40")}
                    >
                      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-accent")} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium text-ink [overflow-wrap:anywhere]">{n.title}</span>
                        {n.body ? <span className="mt-0.5 line-clamp-2 block text-[13px] text-ink-3">{n.body}</span> : null}
                      </span>
                      <span className="shrink-0 text-xs text-ink-3">{ago(n.createdAt, now)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-divider px-4 py-2 text-right">
            <a href="/profile#notifications" className="text-[13px] text-ink-3 hover:text-ink" onClick={() => setOpen(false)}>
              Notification settings
            </a>
          </div>
        </div>
      ) : null}
    </div>
  );
}
