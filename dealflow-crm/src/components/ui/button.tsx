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
          "border border-[#3a3a3a] bg-[#111111] text-[#f5f5f5] shadow-sm hover:border-[#525252] hover:bg-[#1a1a1a] hover:shadow-[0_0_20px_-4px_rgba(245,245,245,0.12)]",
        outline:
          "border border-[#2a2a2a] bg-[#161616] text-[#f0f0f0] hover:border-[#3a3a3a] hover:bg-[#1a1a1a]",
        ghost: "text-[#e4e4e4] hover:bg-white/[0.06]",
        destructive:
          "border border-red-900/50 bg-red-950/80 text-red-100 hover:border-red-800/60 hover:bg-red-900/90",
        /** High emphasis CTA — use with `animate-df-pulse-glow` for drill buttons. */
        cta:
          "border border-[#c9a84c]/40 bg-[#141414] text-[#f5f5f5] hover:border-[#c9a84c]/55 hover:bg-[#1a1a1a] hover:shadow-[0_0_24px_-6px_rgba(201,168,76,0.2)]",
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
