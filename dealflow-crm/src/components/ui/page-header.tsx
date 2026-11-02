import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionTabs } from "@/components/ui/section-tabs";

export type Crumb = { label: string; href?: string };

/** Breadcrumb (if nested) → title + subtitle on the left, actions on the right → section tabs underneath. */
export function PageHeader({
  title,
  subtitle,
  crumbs,
  actions,
  className,
  sectionTabs = true,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
  className?: string;
  /** Show the section's route tabs under the title (on by default). */
  sectionTabs?: boolean;
}) {
  return (
    <header className={cn("space-y-2", className)}>
      {crumbs?.length ? (
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-[13px] text-ink-3">
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="flex items-center gap-1">
              {i > 0 ? <ChevronRight className="h-3.5 w-3.5" aria-hidden /> : null}
              {c.href ? (
                <Link href={c.href} className="hover:text-ink hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-ink-2">
                  {c.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-title">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-ink-2">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {sectionTabs ? <SectionTabs className="!mt-5" /> : null}
    </header>
  );
}
