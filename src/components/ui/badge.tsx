
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-contrast enhanced-focus",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[hsl(var(--badge-default))] text-[hsl(var(--badge-default-foreground))] hover:bg-[hsl(var(--badge-default))]/80",
        secondary:
          "border-transparent bg-[hsl(var(--badge-secondary))] text-[hsl(var(--badge-secondary-foreground))] hover:bg-[hsl(var(--badge-secondary))]/80",
        destructive:
          "border-transparent bg-[hsl(var(--badge-destructive))] text-[hsl(var(--badge-destructive-foreground))] hover:bg-[hsl(var(--badge-destructive))]/80",
        success:
          "border-transparent bg-[hsl(var(--badge-success))] text-[hsl(var(--badge-success-foreground))] hover:bg-[hsl(var(--badge-success))]/80",
        warning:
          "border-transparent bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))] hover:bg-[hsl(var(--warning))]/80",
        outline: "text-[hsl(var(--small-text-primary))] border-[hsl(var(--border))]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
