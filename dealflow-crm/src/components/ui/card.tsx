import * as React from "react";
import { cn } from "@/lib/utils";

/** Section container: surface, 1px border, 10px radius, no shadow. */
export function Card({
  className,
  interactive,
  title,
  action,
  children,
  ...props
}: Omit<React.HTMLAttributes<HTMLDivElement>, "title"> & {
  interactive?: boolean;
  /** Optional header row: title on the left… */
  title?: React.ReactNode;
  /** …and a text link or small action on the right. */
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-border bg-surface",
        interactive && "cursor-pointer transition-colors hover:border-border-strong",
        title || action ? "p-5" : null,
        className,
      )}
      {...props}
    >
      {title || action ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {typeof title === "string" ? <h2 className="section-title">{title}</h2> : title}
          {action ? <div className="shrink-0 text-[13px]">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
