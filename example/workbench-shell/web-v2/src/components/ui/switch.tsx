import * as React from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent',
      'bg-input transition-colors',
      'data-[state=checked]:bg-brand',
      'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
      'disabled:pointer-events-none disabled:opacity-50',
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        'pointer-events-none block size-4 rounded-full bg-surface shadow-surface ring-0 transition-transform',
        'data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0.5',
        'dark:data-[state=checked]:bg-brand-foreground dark:data-[state=unchecked]:bg-foreground',
      )}
    />
  </SwitchPrimitive.Root>
))
Switch.displayName = 'Switch'
