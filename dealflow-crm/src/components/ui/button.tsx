import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)] text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        /** The one main action on a screen. */
        primary: "bg-accent font-semibold text-on-accent hover:bg-accent-hover",
        secondary: "border border-border-strong bg-surface font-medium text-ink hover:bg-surface-2",
        ghost: "font-medium text-accent hover:bg-accent-tint",
        /** Only for destructive confirms. */
        danger: "bg-danger font-semibold text-white hover:opacity-90",
        // Older names, kept so existing pages keep working.
        default: "border border-border-strong bg-surface font-medium text-ink hover:bg-surface-2",
        outline: "border border-border-strong bg-surface font-medium text-ink hover:bg-surface-2",
        cta: "bg-accent font-semibold text-on-accent hover:bg-accent-hover",
        destructive: "bg-danger font-semibold text-white hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        default: "h-9 px-4",
        lg: "h-10 px-5",
      },
    },
    defaultVariants: { variant: "secondary", size: "default" },
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
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
