import * as React from "react";
import { cn } from "@/lib/utils";

const NOISE_SVG =
  "data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E";

export function Card({
  className,
  interactive,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-white/10 bg-zinc-900/75 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-lg hover:shadow-black/25",
        "before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/[0.05] before:to-transparent before:to-55%",
        interactive && "cursor-pointer",
        className,
      )}
      {...props}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center opacity-[0.04] mix-blend-overlay"
        style={{ backgroundImage: `url("${NOISE_SVG}")` }}
        aria-hidden
      />
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
