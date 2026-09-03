import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        // 几何：32px 高、圆角 10px、水平内边距 10px、文字 14px、placeholder muted。
        'flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        'disabled:pointer-events-none disabled:opacity-50',
        'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/30',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'
