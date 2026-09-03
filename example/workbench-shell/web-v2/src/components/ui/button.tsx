import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { cn } from '@/lib/utils'

// Button variants per templates/workbench-shell/components.md §Button.
const buttonVariants = cva(
  // 几何：32px 高，圆角 8px，水平内边距 10px，元素间距 6px，文字 14px medium。
  [
    'inline-flex items-center justify-center gap-1.5 whitespace-nowrap',
    'rounded-md text-sm font-medium leading-5',
    'transition-colors',
    'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
    'disabled:pointer-events-none disabled:opacity-50',
    'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/30',
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border border-input bg-transparent text-foreground hover:bg-accent',
        brand: 'bg-brand text-brand-foreground hover:bg-brand/90',
        brandSubtle: 'bg-brand/12 text-brand hover:bg-brand/20',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'text-foreground hover:bg-accent',
        destructive: 'bg-destructive/12 text-destructive hover:bg-destructive/20',
        link: 'text-brand underline-offset-4 hover:underline',
      },
      size: {
        xs: 'h-6 px-2 text-xs',
        sm: 'h-7 px-2.5 text-label',
        default: 'h-8 px-2.5',
        lg: 'h-9 px-3',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : 'button'
    return (
      <Comp
        data-slot="button"
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { buttonVariants }
