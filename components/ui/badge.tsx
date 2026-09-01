import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.05em]", {
  variants: {
    variant: {
      default: "border-transparent bg-primary text-primary-foreground",
      outline: "border-border bg-transparent text-muted-foreground",
      available: "border-emerald-200 bg-emerald-50 text-emerald-700",
      checkedOut: "border-amber-200 bg-amber-50 text-amber-700",
      maintenance: "border-red-200 bg-red-50 text-red-700",
      good: "border-emerald-200 bg-emerald-50 text-emerald-700",
      monitor: "border-amber-200 bg-amber-50 text-amber-700",
      service: "border-red-200 bg-red-50 text-red-700",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
