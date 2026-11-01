"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { rank, type Match } from "@/lib/fuzzy";
import { cn } from "@/lib/utils";

export type SearchOption = { value: string; label: string; sublabel?: string; disabled?: boolean; keywords?: string };

type Common = {
  /** Fixed options, filtered on the client. */
  options?: SearchOption[];
  /** Server-backed search: GET {endpoint}?q= → { results: SearchOption[] } (150 ms debounce). */
  endpoint?: string;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  /** Remembers picks in this browser so recent / most-used options come first. */
  recentKey?: string;
  /** Last row: "Add 'xyz'". Return the created option (or null to cancel). */
  onCreate?: (label: string) => Promise<SearchOption | null> | SearchOption | null;
  createLabel?: (q: string) => string;
  /** Selected options that may not be in `options` (e.g. server-backed initial value). */
  knownOptions?: SearchOption[];
  size?: "sm" | "md";
};
type SingleProps = Common & { multiple?: false; value: string; onChange: (value: string, option: SearchOption | null) => void };
type MultiProps = Common & { multiple: true; value: string[]; onChange: (value: string[], options: SearchOption[]) => void };
export type SearchSelectProps = SingleProps | MultiProps;

const VISIBLE = 8;

type Usage = Record<string, { n: number; t: number }>;
function readUsage(key?: string): Usage {
  if (!key) return {};
  try {
    return JSON.parse(localStorage.getItem(`ss:${key}`) ?? "{}") as Usage;
  } catch {
    return {};
  }
}
function bumpUsage(key: string | undefined, value: string) {
  if (!key || !value) return;
  try {
    const u = readUsage(key);
    u[value] = { n: (u[value]?.n ?? 0) + 1, t: Date.now() };
    localStorage.setItem(`ss:${key}`, JSON.stringify(u));
  } catch {
    /* storage unavailable */
  }
}

function Highlight({ text, m }: { text: string; m?: Match }) {
  if (!m?.positions.length) return <>{text}</>;
  const set = new Set(m.positions);
  return (
    <>
      {[...text].map((ch, i) =>
        set.has(i) ? (
          <b key={i} className="font-semibold text-ink">
            {ch}
          </b>
        ) : (
          <span key={i}>{ch}</span>
        ),
      )}
    </>
  );
}

/**
 * Search-as-you-type picker (ARIA combobox). Replaces every dropdown in the app.
 * Focus opens suggestions (recent and most-used first); typing ranks exact → prefix → word prefix → contains → fuzzy.
 */
export function SearchSelect(props: SearchSelectProps) {
  const { options = [], endpoint, placeholder = "Search…", ariaLabel, className, disabled, recentKey, onCreate, knownOptions = [], size = "md" } = props;
  const multiple = props.multiple === true;
  const values = useMemo(() => (multiple ? (props.value as string[]) : props.value ? [props.value as string] : []), [multiple, props.value]);
  const listId = useId();
  const inputId = props.id ?? `${listId}-input`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [remote, setRemote] = useState<SearchOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [seen, setSeen] = useState<SearchOption[]>(knownOptions);
  const [usage, setUsage] = useState<Usage>({});

  useEffect(() => setUsage(readUsage(recentKey)), [recentKey, open]);

  // Server-backed lists.
  useEffect(() => {
    if (!endpoint || !open) return;
    const ctrl = new AbortController();
    setLoading(true);
    const t = window.setTimeout(async () => {
      try {
        const sep = endpoint.includes("?") ? "&" : "?";
        const res = await fetch(`${endpoint}${sep}q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.ok) {
          const d = (await res.json()) as { results: SearchOption[] };
          setRemote(d.results);
          setSeen((s) => [...s, ...d.results.filter((r) => !s.some((x) => x.value === r.value))]);
        }
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [endpoint, q, open]);

  const pool = endpoint ? remote : options;
  const all = useMemo(() => [...options, ...seen], [options, seen]);
  const optionFor = useCallback((v: string) => all.find((o) => o.value === v) ?? null, [all]);

  const results = useMemo(() => {
    const base = pool.filter((o) => !(multiple && values.includes(o.value)));
    if (q.trim()) return rank(base, q, (o) => o.label, (o) => `${o.sublabel ?? ""} ${o.keywords ?? ""}`);
    // Empty query: recent and most-used first, then the list as given (or alphabetical for long lists).
    const used = base.filter((o) => usage[o.value]).sort((a, b) => usage[b.value].n - usage[a.value].n || usage[b.value].t - usage[a.value].t).slice(0, 5);
    const rest = base.filter((o) => !used.includes(o));
    return [...used, ...rest];
  }, [pool, q, usage, multiple, values]);

  const exact = results.some((o) => o.label.trim().toLowerCase() === q.trim().toLowerCase());
  const showCreate = Boolean(onCreate && q.trim() && !exact);
  const rows = results.length + (showCreate ? 1 : 0);

  useEffect(() => setActive(0), [q, open]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQ("");
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // Keep the highlighted row in view.
  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-opt-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, open, listId]);

  const pick = (o: SearchOption) => {
    if (o.disabled) return;
    bumpUsage(recentKey, o.value);
    setSeen((s) => (s.some((x) => x.value === o.value) ? s : [...s, o]));
    if (multiple) {
      const next = [...values, o.value];
      (props as MultiProps).onChange(next, next.map((v) => optionFor(v) ?? (v === o.value ? o : { value: v, label: v })));
      setQ("");
      inputRef.current?.focus();
    } else {
      (props as SingleProps).onChange(o.value, o);
      setOpen(false);
      setQ("");
    }
  };

  const create = async () => {
    if (!onCreate) return;
    const made = await onCreate(q.trim());
    if (made) pick(made);
  };

  const remove = (v: string) => {
    if (!multiple) return;
    const next = values.filter((x) => x !== v);
    (props as MultiProps).onChange(next, next.map((x) => optionFor(x) ?? { value: x, label: x }));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive((a) => Math.min(rows - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      if (!open) return;
      e.preventDefault();
      if (active < results.length) pick(results[active]);
      else if (showCreate) void create();
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
        setQ("");
      }
    } else if (e.key === "Tab" && open && results[active] && q.trim()) {
      pick(results[active]);
    } else if (e.key === "Backspace" && multiple && !q && values.length) {
      remove(values[values.length - 1]);
    }
  };

  const selected = !multiple && values[0] ? optionFor(values[0]) : null;
  const displayText = open ? q : (selected?.label ?? "");

  return (
    <div ref={rootRef} className={cn("relative w-full min-w-0", className)}>
      <div
        className={cn(
          "flex w-full items-center gap-1 rounded-[var(--radius)] border border-border-strong bg-surface text-ink",
          size === "sm" ? "min-h-8 px-2 text-[13px]" : "min-h-9 px-2.5 text-sm",
          open && "border-accent ring-2 ring-accent/25",
          disabled && "opacity-50",
        )}
        onClick={() => {
          if (disabled) return;
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        {multiple ? (
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1 py-1">
            {values.map((v) => (
              <span key={v} className="inline-flex max-w-full items-center gap-1 rounded bg-accent-tint px-1.5 py-0.5 text-xs text-accent">
                <span className="truncate">{optionFor(v)?.label ?? v}</span>
                <button
                  type="button"
                  aria-label={`Remove ${optionFor(v)?.label ?? v}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(v);
                  }}
                  className="text-accent/70 hover:text-accent"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <input
              ref={inputRef}
              id={inputId}
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={open && rows ? `${listId}-opt-${active}` : undefined}
              aria-label={ariaLabel ?? placeholder}
              disabled={disabled}
              value={q}
              placeholder={values.length ? "" : placeholder}
              onFocus={() => setOpen(true)}
              onChange={(e) => {
                setQ(e.target.value);
                setOpen(true);
              }}
              onKeyDown={onKeyDown}
              className="min-w-16 flex-1 bg-transparent py-0.5 outline-none placeholder:text-ink-3 focus-visible:outline-none"
            />
          </span>
        ) : (
          <input
            ref={inputRef}
            id={inputId}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && rows ? `${listId}-opt-${active}` : undefined}
            aria-label={ariaLabel ?? placeholder}
            disabled={disabled}
            value={displayText}
            placeholder={selected ? selected.label : placeholder}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onKeyDown={onKeyDown}
            className={cn("min-w-0 flex-1 truncate bg-transparent outline-none focus-visible:outline-none", open && selected ? "placeholder:text-ink-2" : "placeholder:text-ink-3")}
          />
        )}
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-3 transition-transform", open && "rotate-180")} aria-hidden />
      </div>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-multiselectable={multiple || undefined}
          className="absolute left-0 right-0 z-[60] mt-1 overflow-y-auto rounded-[var(--radius)] border border-border bg-surface py-1 shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
          style={{ maxHeight: `${VISIBLE * 36 + 8}px` }}
        >
          {results.map((o, i) => {
            const isSel = values.includes(o.value);
            return (
              <li
                key={`${o.value}-${i}`}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={isSel}
                aria-disabled={o.disabled || undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex min-h-9 cursor-pointer items-center gap-2 px-2.5 py-1.5 text-sm",
                  i === active ? "bg-accent-tint" : "",
                  o.disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ink-2">
                    <Highlight text={o.label} m={(o as SearchOption & { _m?: Match })._m} />
                  </span>
                  {o.sublabel ? <span className="block truncate text-xs text-ink-3">{o.sublabel}</span> : null}
                </span>
                {isSel ? <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden /> : null}
              </li>
            );
          })}
          {showCreate ? (
            <li
              id={`${listId}-opt-${results.length}`}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void create()}
              onMouseEnter={() => setActive(results.length)}
              className={cn("flex min-h-9 cursor-pointer items-center gap-2 px-2.5 py-1.5 text-sm text-accent", active === results.length && "bg-accent-tint")}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {props.createLabel ? props.createLabel(q.trim()) : `Add “${q.trim()}”`}
            </li>
          ) : null}
          {!results.length && !showCreate ? (
            <li className="px-2.5 py-2 text-sm text-ink-3">{loading ? "Searching…" : q.trim() ? `No matches for “${q.trim()}”` : "Nothing to pick yet"}</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
