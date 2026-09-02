import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/utils"

interface SwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
}

function Switch({ checked, onCheckedChange, className }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent bg-input outline-none transition-colors data-[checked]:bg-primary disabled:opacity-50",
        className
      )}
    >
      <SwitchPrimitive.Thumb className="block size-4 translate-x-0.5 rounded-full bg-background shadow-sm transition-transform data-[checked]:translate-x-[18px]" />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
