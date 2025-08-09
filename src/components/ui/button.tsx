
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 enhanced-focus",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 btn-small-text",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 btn-small-text",
        success:
          "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:bg-[hsl(var(--success))]/90 btn-small-text",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground text-[hsl(var(--small-text-primary))] btn-small-text",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 text-[hsl(var(--small-text-primary))] btn-small-text",
        ghost: "hover:bg-accent hover:text-accent-foreground text-[hsl(var(--small-text-primary))] btn-small-text",
        link: "text-[hsl(var(--link))] underline-offset-4 hover:underline hover:text-[hsl(var(--link-hover))] font-medium",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs font-medium",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
