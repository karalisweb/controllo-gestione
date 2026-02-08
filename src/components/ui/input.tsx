import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Input - Ref: DESIGN-SYSTEM.md sezione 5.4
 * Background: --bg-tertiary (#1a2d44)
 * Border: --border-color (#2a2a35)
 * Focus: border oro + glow arancione
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-[#71717a] selection:bg-primary selection:text-primary-foreground border h-9 w-full min-w-0 rounded-lg bg-[#1a2d44] border-[#2a2a35] px-4 py-2 text-base text-[#f5f5f7] transition-all duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-[#d4a726] focus-visible:ring-[3px] focus-visible:ring-[rgba(255,107,53,0.1)]",
        "aria-invalid:ring-[rgba(239,68,68,0.2)] aria-invalid:border-[#ef4444]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
