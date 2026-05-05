import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "border border-cyan-400/25 bg-gradient-to-b from-cyan-400 to-cyan-600 text-zinc-950 shadow-[0_0_22px_-6px_rgba(0,188,212,0.55)] hover:from-cyan-300 hover:to-cyan-500 hover:shadow-[0_0_32px_-4px_rgba(0,188,212,0.75)]",
        outline:
          "border border-white/10 bg-zinc-900/80 text-zinc-100 hover:border-white/18 hover:bg-zinc-800/90",
        ghost: "text-zinc-200 hover:bg-white/[0.06]",
        destructive:
          "border border-red-500/35 bg-gradient-to-b from-red-600 to-red-800 text-white shadow-md hover:from-red-500 hover:to-red-700 hover:border-red-400/40 hover:shadow-[0_0_20px_-4px_rgba(248,113,113,0.4)]",
        /** High emphasis CTA — use with `animate-df-pulse-glow` for drill buttons. */
        cta:
          "border border-cyan-400/40 bg-gradient-to-b from-cyan-400 to-cyan-600 text-zinc-950 shadow-[0_0_26px_-4px_rgba(0,188,212,0.65)] hover:from-cyan-300 hover:to-cyan-500",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
