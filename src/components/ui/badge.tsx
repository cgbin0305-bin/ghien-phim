import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium uppercase tracking-[0.1em] transition-colors",
  {
    variants: {
      variant: {
        default: "border-ink-600 bg-ink-800 text-parchment-200",
        gold: "border-gold-500/40 bg-gold-500/12 text-gold-200",
        jade: "border-jade-500/40 bg-jade-500/12 text-jade-100",
        rouge: "border-rouge-500/40 bg-rouge-500/12 text-rouge-300",
        outline: "border-ink-600 bg-transparent text-parchment-300/80",
        muted: "border-transparent bg-ink-800/60 text-mist-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
