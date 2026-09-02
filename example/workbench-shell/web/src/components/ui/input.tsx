import { Input as InputPrimitive } from "@base-ui/react/input"
import { forwardRef } from "react"
import { cn } from "@/lib/utils"

export const Input = forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <InputPrimitive
        ref={ref}
        className={cn(
          "flex h-8 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"
