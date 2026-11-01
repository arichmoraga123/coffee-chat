import { cn } from "@/lib/utils";

/** Uppercase 12px header, 1px divider rows, no zebra stripes, scrolls sideways on small screens. */
export function DataTable({ className, children, minWidth }: { className?: string; children: React.ReactNode; minWidth?: number }) {
  return (
    <div className={cn("overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-surface", className)}>
      <table className="w-full border-collapse text-left text-sm" style={minWidth ? { minWidth } : undefined}>
        {children}
      </table>
    </div>
  );
}

export function Th({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      {...props}
      className={cn("border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.06em] text-ink-3", className)}
    >
      {children}
    </th>
  );
}

export function Td({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td {...props} className={cn("border-b border-divider px-4 py-3 align-middle text-ink", className)}>
      {children}
    </td>
  );
}
