import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Button variants - Ref: DESIGN-SYSTEM.md sezione 5.1
 * Primary: gradiente oro (#d4a726) > arancione (#ff8f65)
 * Hover: translateY(-2px) + ombra arancione
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(255,107,53,0.3)] cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        gradient:
          "text-white shadow-lg hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(255,107,53,0.3)]",
        destructive:
          "text-white hover:opacity-90",
        outline:
          "border border-[#2a2a35] bg-[#1a2d44] text-[#f5f5f7] hover:bg-[#234058] hover:border-[#3a3a45]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-[#1a2d44] hover:text-[#f5f5f7]",
        link: "text-[#d4a726] underline-offset-4 hover:underline",
        success:
          "text-white",
        "success-outline":
          "border-2 border-[#22c55e] text-[#22c55e] bg-transparent hover:bg-[rgba(16,185,129,0.1)]",
      },
      size: {
        default: "h-9 px-6 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-lg gap-1.5 px-4 has-[>svg]:px-2.5 text-[0.8rem]",
        lg: "h-10 rounded-lg px-6 has-[>svg]:px-4",
        icon: "size-8",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  style,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  // Stili inline per gradienti (non gestibili con Tailwind puro)
  const gradientStyles: Record<string, React.CSSProperties> = {
    gradient: {
      background: 'linear-gradient(135deg, #d4a726, #ff8f65)',
    },
    destructive: {
      background: 'linear-gradient(135deg, #ef4444, #f87171)',
    },
    success: {
      background: 'linear-gradient(135deg, #22c55e, #34d399)',
    },
  }

  const variantStyle = variant ? gradientStyles[variant] : undefined

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      style={{ ...variantStyle, ...style }}
      {...props}
    />
  )
}

export { Button, buttonVariants }
