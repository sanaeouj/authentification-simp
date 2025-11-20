import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        status: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const colorClasses = {
  green: "bg-green-500/10 border-green-500/20 text-black",
  yellow: "bg-orange-500/10 border-orange-500/20 text-black",
  gray: "bg-slate-500/10 border-slate-500/20 text-black",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  color?: 'green' | 'yellow' | 'gray';
}

function Badge({ className, variant, color, ...props }: BadgeProps) {
  const colorClass = variant === 'status' && color ? colorClasses[color] : '';
  return <div className={cn(badgeVariants({ variant }), colorClass, className)} {...props} />;
}

export { Badge, badgeVariants };

