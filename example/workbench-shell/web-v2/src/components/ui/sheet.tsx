import * as React from 'react'
import { Dialog as SheetPrimitive } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Sheet：右侧最多 384px 或 75%，14px 边界，floating shadow；窄侧用覆盖层，路由跳转后关闭。
export const Sheet = SheetPrimitive.Root
export const SheetTrigger = SheetPrimitive.Trigger
export const SheetClose = SheetPrimitive.Close
export const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
      className,
    )}
    {...props}
  />
))
SheetOverlay.displayName = 'SheetOverlay'

const sheetVariants = cva(
  'fixed z-50 gap-3 bg-popover text-popover-foreground shadow-floating transition ease-out',
  {
    variants: {
      side: {
        right: 'inset-y-0 right-0 h-full w-3/4 max-w-[384px] border-l border-border data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
        left: 'inset-y-0 left-0 h-full w-3/4 max-w-[384px] border-r border-border data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
      },
    },
    defaultVariants: { side: 'right' },
  },
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = 'right', className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content ref={ref} className={cn(sheetVariants({ side }), className)} {...props}>
      {children}
      <SheetPrimitive.Close
        aria-label="关闭面板"
        className={cn(
          'absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md',
          'text-muted-foreground hover:bg-accent hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        )}
      >
        <X className="size-4" />
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = 'SheetContent'

export const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1 border-b border-border p-4', className)} {...props} />
)
SheetHeader.displayName = 'SheetHeader'

export const SheetBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex-1 overflow-y-auto p-4', className)} {...props} />
)
SheetBody.displayName = 'SheetBody'

export const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-row justify-end gap-2 border-t border-border p-4', className)} {...props} />
)
SheetFooter.displayName = 'SheetFooter'

export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title ref={ref} className={cn('text-title-sm font-medium leading-6', className)} {...props} />
))
SheetTitle.displayName = 'SheetTitle'

export const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn('text-caption text-muted-foreground', className)} {...props} />
))
SheetDescription.displayName = 'SheetDescription'
