import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { Check, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface CheckboxProps {
  checked?: boolean
  indeterminate?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
  onClick?: (e: React.MouseEvent<HTMLSpanElement>) => void
}

function Checkbox({ checked, indeterminate, onCheckedChange, className, onClick }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      indeterminate={indeterminate}
      onCheckedChange={onCheckedChange}
      onClick={onClick}
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded border border-input bg-background text-primary outline-none transition-colors hover:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 data-[checked]:border-primary data-[checked]:bg-primary data-[checked]:text-primary-foreground disabled:opacity-50",
        className
      )}
    >
      <CheckboxPrimitive.Indicator className="flex size-full items-center justify-center">
        {indeterminate ? <Minus className="size-3" /> : <Check className="size-3" />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
