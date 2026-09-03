import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border border-input bg-transparent',
      'transition-colors hover:border-foreground/40',
      'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
      'disabled:pointer-events-none disabled:opacity-50',
      'data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-brand-foreground',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      {props.checked === 'indeterminate' ? <Minus className="size-3" /> : <Check className="size-3" />}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = 'Checkbox'
